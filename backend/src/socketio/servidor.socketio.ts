import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { entorno } from '../configuracion/entorno';
import { sesionServicio } from '../servicios/sesion.servicio';

/** Instancia global del servidor Socket.io, accesible por otros módulos */
export let ioInstance: Server;

/**
 * Parsea el valor de una cookie específica desde el header Cookie crudo.
 * @param cookieHeader - Cadena con las cookies del request (formato "key=value; key2=value2")
 * @param nombre - Nombre de la cookie a extraer
 * @returns Valor de la cookie o null si no se encuentra
 */
function parsearCookie(cookieHeader: string, nombre: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [clave, ...valorPartes] = cookie.trim().split('=');
    if (clave === nombre) {
      return decodeURIComponent(valorPartes.join('='));
    }
  }
  return null;
}

/**
 * Middleware de autenticación para Socket.io.
 * Verifica que el cliente tenga una cookie de sesión válida en Redis.
 * Si la sesión es válida, adjunta los datos del usuario al socket.
 */
async function middlewareAutenticacion(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next(new Error('No autorizado'));
    }

    const sessionId = parsearCookie(cookieHeader, 'sessionId');

    if (!sessionId) {
      return next(new Error('No autorizado'));
    }

    const sesion = await sesionServicio.verificarSesion(sessionId);

    if (!sesion) {
      return next(new Error('No autorizado'));
    }

    socket.data.usuario = { id: sesion.idUsuario, alias: sesion.alias };
    next();
  } catch {
    next(new Error('No autorizado'));
  }
}

/**
 * Manejador de nuevas conexiones Socket.io.
 * Une al socket a una sala identificada por el ID del usuario para dirigir eventos de forma exclusiva.
 */
function manejarConexion(socket: Socket): void {
  const { id, alias } = socket.data.usuario;
  socket.join(`usuario:${id}`);
  console.log(`Socket.io: usuario "${alias}" (id=${id}) conectado, socket=${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket.io: usuario "${alias}" (id=${id}) desconectado, socket=${socket.id}`);
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

  ioInstance.use(middlewareAutenticacion);
  ioInstance.on('connection', manejarConexion);

  httpServer.listen(entorno.PUERTO_SOCKET, () => {
    console.log(`Servidor Socket.io escuchando en puerto ${entorno.PUERTO_SOCKET}`);
  });

  return httpServer;
}
