/**
 * Property-Based Test: Reconexión Socket.io sin re-autenticación
 *
 * **Validates: Requirements 10.4**
 *
 * Para cualquier cliente Socket.io que se desconecta y reconecta mientras su sesión
 * en Redis sigue válida, el sistema debe permitir la reconexión sin requerir un nuevo
 * proceso de login.
 *
 * La propiedad se valida verificando que el middleware de autenticación de Socket.io
 * verifica la cookie de sesión en cada intento de conexión (incluidas reconexiones).
 * Si la sesión sigue válida en Redis, la reconexión se acepta sin nuevo login.
 */
import fc from 'fast-check';
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
    PUERTO_SOCKET: 0, // Puerto dinámico para tests
  },
}));

import { iniciarServidorSocketio, ioInstance } from './servidor.socketio';
import { sesionServicio } from '../servicios/sesion.servicio';

const verificarSesionMock = sesionServicio.verificarSesion as jest.Mock;

/**
 * Arbitrary: genera un sessionId con formato UUID v4
 */
const sessionIdArb = fc.uuid();

/**
 * Arbitrary: genera un alias válido (alfanumérico, 3-20 caracteres)
 */
const aliasArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{2,19}$/);

/**
 * Arbitrary: genera un idUsuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

describe('Property Test — Reconexión Socket.io sin re-autenticación', () => {
  let httpServer: HttpServer;
  let puerto: number;

  beforeAll((done) => {
    httpServer = iniciarServidorSocketio();
    httpServer.on('listening', () => {
      puerto = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    ioInstance.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: conecta un cliente Socket.io con la cookie de sesión proporcionada.
   */
  function conectarCliente(sessionId: string): ClientSocket {
    return ioClient(`http://localhost:${puerto}`, {
      transports: ['websocket'],
      forceNew: true,
      extraHeaders: { cookie: `sessionId=${sessionId}` },
    });
  }

  /**
   * Helper: espera a que un socket cliente se conecte.
   */
  function esperarConexion(socket: ClientSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout de conexión')), 3000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Helper: espera a que un socket cliente se desconecte.
   */
  function esperarDesconexion(socket: ClientSocket): Promise<void> {
    return new Promise((resolve) => {
      if (!socket.connected) {
        resolve();
        return;
      }
      socket.on('disconnect', () => resolve());
      socket.disconnect();
    });
  }

  it('Property 17: Cliente que se desconecta y reconecta con sesión válida es aceptado sin nuevo login', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionIdArb,
        idUsuarioArb,
        aliasArb,
        async (sessionId, idUsuario, alias) => {
          verificarSesionMock.mockReset();

          // Simular sesión válida en Redis durante todo el ciclo
          verificarSesionMock.mockResolvedValue({ idUsuario, alias });

          // --- Primera conexión ---
          const cliente1 = conectarCliente(sessionId);
          await esperarConexion(cliente1);

          // Verificar que la primera conexión fue autenticada mediante verificarSesion
          expect(verificarSesionMock).toHaveBeenCalledWith(sessionId);
          const llamadasConexion1 = verificarSesionMock.mock.calls.length;

          // --- Desconexión ---
          await esperarDesconexion(cliente1);

          // --- Reconexión (simulando mismo cliente con misma sesión) ---
          const cliente2 = conectarCliente(sessionId);
          await esperarConexion(cliente2);

          // PROPIEDAD (Req 10.4): La reconexión fue aceptada verificando la sesión
          // en Redis sin requerir un nuevo login — solo la cookie de sesión existente
          expect(verificarSesionMock).toHaveBeenCalledWith(sessionId);
          expect(verificarSesionMock.mock.calls.length).toBeGreaterThan(llamadasConexion1);

          // PROPIEDAD: El socket reconectado tiene los datos de usuario correctos
          const sockets = Array.from(ioInstance.sockets.sockets.values());
          const socketReconectado = sockets.find(
            (s) => s.data.usuario?.id === idUsuario && s.data.usuario?.alias === alias
          );
          expect(socketReconectado).toBeDefined();

          // PROPIEDAD: El socket fue unido a la sala del usuario
          const sala = ioInstance.sockets.adapter.rooms.get(`usuario:${idUsuario}`);
          expect(sala).toBeDefined();
          expect(sala!.size).toBeGreaterThanOrEqual(1);

          // Limpieza
          cliente2.disconnect();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17 (negativa): Cliente que reconecta con sesión expirada es rechazado', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionIdArb,
        idUsuarioArb,
        aliasArb,
        async (sessionId, idUsuario, alias) => {
          verificarSesionMock.mockReset();

          // Primera conexión con sesión válida
          verificarSesionMock.mockResolvedValue({ idUsuario, alias });

          const cliente1 = conectarCliente(sessionId);
          await esperarConexion(cliente1);

          // Desconexión
          await esperarDesconexion(cliente1);

          // Simular que la sesión expiró en Redis
          verificarSesionMock.mockResolvedValue(null);

          // Intentar reconexión — debe ser rechazada
          const cliente2 = conectarCliente(sessionId);

          const rechazado = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 3000);
            cliente2.on('connect_error', (err) => {
              clearTimeout(timeout);
              expect(err.message).toBe('No autorizado');
              resolve(true);
            });
            cliente2.on('connect', () => {
              clearTimeout(timeout);
              resolve(false);
            });
          });

          // PROPIEDAD: Si la sesión ya no es válida, la reconexión es rechazada
          expect(rechazado).toBe(true);

          // Limpieza
          cliente2.disconnect();
        }
      ),
      { numRuns: 100 }
    );
  });
});
