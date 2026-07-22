import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { entorno } from '../recursos/entorno';
import { sesionServicio } from '../servicios/sesion.servicio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { DatosActualizar } from '@/repositorios/dispositivo.repositorio';


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
  const { id, alias, claveSesion } = socket.data.usuario;

  socket.join(`usuario:${id}`);
  console.log(`📡 Socket.io: usuario "${alias}" (id=${id}) conectado, socket=${socket.id}`);

  await redisRepositorio.actualizarIdSocket(claveSesion, socket.id)

  // socket.on('dispositivos', async () => {

  const dispositivos = await redisRepositorio.obtenerDispositivosUsuario(id)
  // });

  socket.emit(
    'dispositivos',
    dispositivos
  );


  socket.on('disconnect', () => {
    console.log(`📡 Socket.io: usuario "${alias}" (id=${id}) desconectado, socket=${socket.id}`);
  });
}

/**
 * Inicia el servidor Socket.io en el puerto configurado.
 * Configura CORS, middleware de autenticación y manejador de conexiones.
 * @returns El servidor HTTP subyacente (útil para cerrar en tests)
 */
export function iniciarServidorSocketio(): HttpServer {
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

  httpServer.listen(entorno.PUERTO_SOCKET, () => {
    console.log(`📡 Servidor Socket.io escuchando en puerto ${entorno.PUERTO_SOCKET}`);
  });

  return httpServer;
}


export async function enviarDispositivoActualizado(
  claveDispositivo: string
): Promise<void> {

  const dispositivo = await redisRepositorio.obtenerDispositivo(claveDispositivo);

  ioInstance
    .of('/socket')
    .to(`usuario:${dispositivo?.idUsuario}`)
    .emit('dispositivo', dispositivo);
}