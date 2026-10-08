import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { entorno } from './recursos/entorno';
import { sesionServicio } from './servicios/sesion.servicio';
import { redisRepositorio } from './repositorios/redis.repositorio';
import crypto from 'crypto';
import dayjs from 'dayjs';

import { enviarSolicitudDispositivo } from './broker';
import { agregarNotificacion, eliminarNotificacionPorAlarma } from './repositorios/redis/notificaciones.redis';
import { crearEventoSistema } from './repositorios/base-datos/evento.repositorio';

/** Instancia global del servidor Socket.io, accesible por otros módulos */
export let ioInstance: Server;

/**
 * Middleware de autenticación para Socket.io.
 * Verifica que el cliente tenga una cookie de sesión válida en Redis.
 * Si la sesión es válida, adjunta los datos del usuario al socket.
 */
async function middlewareAutenticacion(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {

    const claveSesion = socket.handshake.auth.claveSesion;

    if (!claveSesion) {
      return next(new Error('No autorizado'));
    }
    const sesion = await sesionServicio.obtenerSesion(claveSesion);

    if (!sesion) {
      return next(new Error('No autorizado'));
    }

    socket.data.usuario = { id: sesion.idUsuario, alias: sesion.alias, claveSesion: claveSesion };
    next();
  } catch {
    next(new Error('No autorizado'));
  }
}

/**
 * Manejador de nuevas conexiones Socket.io.
 * Une al socket a una sala identificada por el ID del usuario para dirigir eventos de forma exclusiva.
 */
async function manejarConexion(socket: Socket): Promise<void> {
  try {
    const { id, alias, claveSesion } = socket.data.usuario;

    socket.join(`usuario:${id}`);
    console.log(`📡 Socket: usuario "${alias}" (Id=${id}) conectado, socket=${socket.id}`);

    await redisRepositorio.actualizarClaveSocket(claveSesion, socket.id)

    const dispositivos = await redisRepositorio.obtenerDispositivosUsuario(id)
    socket.emit(
      'dispositivos',
      dispositivos
    );

    const notificaciones = await redisRepositorio.obtenerNotificaciones(id)

    socket.emit(
      'notificaciones',
      notificaciones
    );

    socket.on('disconnect', async () => {
      console.log(`📡 Socket: usuario "${alias}" (Id=${id}) desconectado, socket=${socket.id}`);
      try {
        await redisRepositorio.limpiarClaveSocket(id, socket.id);
      } catch (error) {
        console.error('❌ Error al limpiar la clave de socket:', error);
      }
    });

    socket.on('solicitud/dispositivo', async (datos) => {
      try {
        const respuesta = await enviarSolicitudDispositivo(
          datos.clave,
          datos
        );

        if (!respuesta.estatus) {
          socket.emit('error/dispositivo', {
            mensaje: respuesta.mensaje || 'El dispositivo rechazó la solicitud.'
          });
          return;
        }

        if ('estatusAlarma' in datos) {
          if (datos.estatusAlarma == true) {
            const claveAlarmaUsuario = crypto.randomUUID();

            await redisRepositorio.agregarAlarma(
              datos.clave,
              {
                clave: claveAlarmaUsuario,
                descripcion: 'Alarma generada por usuario',
                fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
              }
            );

            const dispositivo = await redisRepositorio.obtenerDispositivo(datos.clave);

            await agregarNotificacion(
              dispositivo.idUsuario,
              {
                clave: crypto.randomUUID(),
                descripcion: `Alarma activada en '${dispositivo.alias}' por usuario.`,
                fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                atendida: null,
                claveDispositivo: dispositivo.clave,
                claveAlarma: claveAlarmaUsuario,
                origen: 'alarma'
              }
            );

            await crearEventoSistema(
              dispositivo.idUsuario,
              `Alarma dispositivo clave:"${datos.clave}" activada por usuario con la clave de alarma:"${claveAlarmaUsuario}"`
            );

            await enviarNotificacionUsuario(dispositivo.idUsuario);
          }
        }

      } catch (error) {
        socket.emit('error/dispositivo',
          {
            mensaje: error instanceof Error ? error.message : 'Error al procesar la solicitud del dispositivo.'
          }
        );
      }
    });

    socket.on('solicitud/alarma', async (datos) => {
      try {

        await redisRepositorio.eliminarAlarma(
          datos.claveDispositivo,
          datos.claveAlarma
        );

        await eliminarNotificacionPorAlarma(
          id,
          datos.claveAlarma,
          datos.claveDispositivo,
          datos.descripcion?.includes('sin conexión') ? 'conexion' : 'alarma'
        );

        await crearEventoSistema(
          id,
          `Alarma dispositivo clave:"${datos.claveDispositivo}" ${datos.descripcion || ''} desactivada con la clave de alarma:"${datos.claveAlarma}"`
        );

        await enviarDispositivoActualizado(datos.claveDispositivo);
        await enviarNotificacionUsuario(id);

      } catch (error) {
        socket.emit('error/dispositivo',
          {
            mensaje: error instanceof Error ? error.message : 'Error al procesar la alarma.'
          }
        );
      }
    });

    socket.on('solicitud/notificacion', async (datos) => {
      try {
        await redisRepositorio.cambiarAtencionNotificacion(
          id,
          datos.clave
        );
        await enviarNotificacionUsuario(id);
      } catch (error) {
        socket.emit(
          'error/notificacion',
          {
            mensaje: error instanceof Error
              ? error.message
              : 'Error al procesar la notificación.'
          }
        );

      }
    });

  } catch (error) {
    console.log(error)
  }
}

/**
 * Inicia el servidor Socket.io en el puerto configurado.
 * Configura CORS, middleware de autenticación y manejador de conexiones.
 * @returns El servidor HTTP subyacente (útil para cerrar en tests)
 */
export async function iniciarServidorSocketio(): Promise<HttpServer> {

  const httpServer = createServer();

  ioInstance = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:4200',
      credentials: true,
    },
  });

  const namespaceSocket = ioInstance.of('/socket');

  namespaceSocket.use(middlewareAutenticacion);
  namespaceSocket.on('connection', manejarConexion);

  await new Promise<void>((resolve, reject) => {

    httpServer.once('error', reject);

    httpServer.listen(
      entorno.PUERTO_SOCKET,
      () => {
        console.log(
          `📡 Socket escuchando en puerto ${entorno.PUERTO_SOCKET}`
        );
        resolve();
      }
    );

  });

  return httpServer;
}

export async function enviarDispositivoActualizado(claveDispositivo: string): Promise<void> {

  const dispositivo = await redisRepositorio.obtenerDispositivo(
    claveDispositivo
  );

  const sockets = await redisRepositorio.obtenerSocketsUsuario(
    dispositivo.idUsuario
  );

  if (sockets.length === 0) {
    return;
  }

  for (const idSocket of sockets) {

    ioInstance
      .of('/socket')
      .to(idSocket)
      .emit(
        'dispositivo',
        dispositivo
      );

  }

}

export async function enviarNotificacionUsuario(idUsuario: number): Promise<void> {

  const notificaciones =
    await redisRepositorio.obtenerNotificaciones(idUsuario);

  const sockets =
    await redisRepositorio.obtenerSocketsUsuario(idUsuario);

  if (sockets.length === 0) {
    return;
  }

  for (const idSocket of sockets) {

    ioInstance
      .of('/socket')
      .to(idSocket)
      .emit(
        'notificaciones',
        notificaciones
      );

  }

}