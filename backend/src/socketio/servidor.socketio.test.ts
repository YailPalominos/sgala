import { Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

// Mocks
jest.mock('../servicios/sesion.servicio', () => ({
  sesionServicio: {
    verificarSesion: jest.fn(),
  },
}));

jest.mock('../configuracion/entorno', () => ({
  entorno: {
    PUERTO_SOCKET: 0, // Puerto 0 para asignación dinámica en tests
  },
}));

import { iniciarServidorSocketio, ioInstance } from './servidor.socketio';
import { sesionServicio } from '../servicios/sesion.servicio';

const verificarSesionMock = sesionServicio.verificarSesion as jest.Mock;

describe('Servidor Socket.io', () => {
  let httpServer: HttpServer;
  let clientSocket: ClientSocket;
  let puerto: number;

  beforeAll((done) => {
    httpServer = iniciarServidorSocketio();
    httpServer.on('listening', () => {
      puerto = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    verificarSesionMock.mockReset();
  });

  afterAll((done) => {
    ioInstance.close();
    httpServer.close(done);
  });

  function conectarCliente(cookies?: string): ClientSocket {
    const opciones: Record<string, unknown> = {
      transports: ['websocket'],
      forceNew: true,
    };
    if (cookies) {
      opciones.extraHeaders = { cookie: cookies };
    }
    return ioClient(`http://localhost:${puerto}`, opciones);
  }

  describe('Middleware de autenticación', () => {
    it('debe rechazar conexión sin cookie de sesión', (done) => {
      clientSocket = conectarCliente();

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('No autorizado');
        done();
      });
    });

    it('debe rechazar conexión con cookie de sesión inválida', (done) => {
      verificarSesionMock.mockResolvedValue(null);
      clientSocket = conectarCliente('sessionId=id-inexistente');

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('No autorizado');
        expect(verificarSesionMock).toHaveBeenCalledWith('id-inexistente');
        done();
      });
    });

    it('debe rechazar conexión cuando la cookie sessionId está ausente entre otras cookies', (done) => {
      clientSocket = conectarCliente('otraCookie=valor123');

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('No autorizado');
        done();
      });
    });

    it('debe aceptar conexión con sesión válida en Redis', (done) => {
      verificarSesionMock.mockResolvedValue({ idUsuario: 5, alias: 'testuser' });
      clientSocket = conectarCliente('sessionId=sesion-valida-123');

      clientSocket.on('connect', () => {
        expect(verificarSesionMock).toHaveBeenCalledWith('sesion-valida-123');
        done();
      });
    });

    it('debe rechazar cuando verificarSesion lanza un error', (done) => {
      verificarSesionMock.mockRejectedValue(new Error('Redis no disponible'));
      clientSocket = conectarCliente('sessionId=sesion-error');

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('No autorizado');
        done();
      });
    });
  });

  describe('Manejo de conexión', () => {
    it('debe unir al socket a la sala del usuario al conectarse', (done) => {
      verificarSesionMock.mockResolvedValue({ idUsuario: 7, alias: 'jugador1' });
      clientSocket = conectarCliente('sessionId=sesion-sala');

      clientSocket.on('connect', () => {
        // Verificar que la sala del usuario tiene el socket
        const salas = ioInstance.sockets.adapter.rooms.get('usuario:7');
        expect(salas).toBeDefined();
        expect(salas!.size).toBeGreaterThanOrEqual(1);
        done();
      });
    });

    it('debe adjuntar datos de usuario al socket', (done) => {
      verificarSesionMock.mockResolvedValue({ idUsuario: 10, alias: 'admin' });
      clientSocket = conectarCliente('sessionId=sesion-datos');

      clientSocket.on('connect', () => {
        const sockets = Array.from(ioInstance.sockets.sockets.values());
        const socketServidor = sockets.find((s) => s.data.usuario?.id === 10);
        expect(socketServidor).toBeDefined();
        expect(socketServidor!.data.usuario).toEqual({ id: 10, alias: 'admin' });
        done();
      });
    });
  });

  describe('Configuración del servidor', () => {
    it('debe exportar la instancia ioInstance', () => {
      expect(ioInstance).toBeDefined();
      expect(typeof ioInstance.emit).toBe('function');
    });

    it('debe tener CORS configurado para http://localhost:4200', () => {
      // Accedemos a la opción de CORS internamente
      const opts = (ioInstance as unknown as { _opts: { cors: { origin: string; credentials: boolean } } })._opts;
      expect(opts.cors.origin).toBe('http://localhost:4200');
      expect(opts.cors.credentials).toBe(true);
    });
  });
});
