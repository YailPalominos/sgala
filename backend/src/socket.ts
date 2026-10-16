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


    socket.on('cambiar-estatus', async (datos, responder) => {
      try {
        const respuesta = await Promise.race([
          enviarSolicitudDispositivo(
            datos.clave,
            'actualizar-estatus',
            datos
          ),

          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  'El dispositivo no respondió dentro del tiempo esperado.'
                )
              );
            }, 12000);
          })
        ]);

        if (respuesta.estatus === false) {
          throw new Error(respuesta.mensaje);
        }

        const dispositivo = await redisRepositorio.obtenerDispositivo(
          datos.clave
        );

        await enviarNotificacionUsuario(dispositivo.idUsuario);

        responder(respuesta);

      } catch (error) {
        responder({
          estatus: false,
          mensaje: error instanceof Error
            ? error.message
            : 'Error al procesar la solicitud.'
        });
      }
    });

    socket.on('obtener-configuracion', async (datos, responder) => {
      try {
        const respuesta = await Promise.race([
          enviarSolicitudDispositivo(
            datos.clave,
            'obtener-configuracion'
          ),

          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  'El dispositivo no respondió dentro del tiempo esperado.'
                )
              );
            }, 12000);
          })
        ]);

        if (respuesta.estatus === false) {
          throw new Error(respuesta.mensaje);
        }

        responder(respuesta);

      } catch (error) {
        responder({
          estatus: false,
          mensaje: error instanceof Error
            ? error.message
            : 'Error al procesar la solicitud.'
        });
      }
    });

    socket.on('actualizar-configuracion', async (datos, responder) => {
      try {
        const respuesta = await Promise.race([
          enviarSolicitudDispositivo(
            datos.clave,
            'actualizar-configuracion',
            datos
          ),

          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  'El dispositivo no respondió dentro del tiempo esperado.'
                )
              );
            }, 12000);
          })
        ]);

        if (respuesta.estatus === false) {
          throw new Error(respuesta.mensaje);
        }

        const dispositivo = await redisRepositorio.obtenerDispositivo(
          datos.clave
        );

        await enviarNotificacionUsuario(dispositivo.idUsuario);

        responder(respuesta);

      } catch (error) {
        responder({
          estatus: false,
          mensaje: error instanceof Error
            ? error.message
            : 'Error al procesar la solicitud.'
        });
      }
    });

    // socket.on('desactivar-alarma', async (datos, responder) => {
    //   try {

    //     await redisRepositorio.eliminarAlarma(
    //       datos.claveDispositivo,
    //       datos.claveAlarma
    //     );

    //     await eliminarNotificacionPorAlarma(
    //       id,
    //       datos.claveAlarma,
    //       datos.claveDispositivo,
    //       datos.descripcion?.includes('sin conexión') ? 'conexion' : 'alarma'
    //     );

    //     await crearEventoSistema(
    //       id,
    //       `Alarma dispositivo clave:"${datos.claveDispositivo}" ${datos.descripcion || ''} desactivada con la clave de alarma:"${datos.claveAlarma}"`
    //     );

    //     await enviarDispositivoActualizado(datos.claveDispositivo);
    //     await enviarNotificacionUsuario(id);

    //   } catch (error) {
    //     socket.emit('error/dispositivo',
    //       {
    //         mensaje: error instanceof Error ? error.message : 'Error al procesar la alarma.'
    //       }
    //     );
    //   }
    // });

    // socket.on('cambiar-atencion-notificacion', async (datos, responder) => {
    //   try {
    //     await redisRepositorio.cambiarAtencionNotificacion(
    //       id,
    //       datos.clave
    //     );
    //     await enviarNotificacionUsuario(id);
    //   } catch (error) {
    //     socket.emit(
    //       'error/notificacion',
    //       {
    //         mensaje: error instanceof Error
    //           ? error.message
    //           : 'Error al procesar la notificación.'
    //       }
    //     );

    //   }
    // });

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