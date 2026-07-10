/**
 * Property-Based Test: Eventos Socket.io solo al propietario
 *
 * **Validates: Requirements 10.2, 11.3**
 *
 * Para cualquier actualización de localización o cambio de estado de conexión de un dispositivo,
 * el evento Socket.io debe emitirse únicamente al usuario propietario del dispositivo
 * y a ningún otro usuario conectado.
 *
 * Se verifica mediante los manejadores MQTT (onConexion, onDesconexion, onPublicacion)
 * que la función emitirAUsuario se invoca exclusivamente con el idUsuario propietario
 * del dispositivo, y que ningún otro idUsuario recibe el evento.
 */
import fc from 'fast-check';
import { onConexion, onDesconexion, onPublicacion } from '../mqtt/manejadores.mqtt';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { emitirAUsuario } from './emisor.socketio';

// Mocks
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio', () => ({
  redisRepositorio: {
    obtenerEstadoDispositivo: jest.fn(),
    guardarEstadoDispositivo: jest.fn(),
  },
}));
jest.mock('../servicios/localizacion.servicio', () => ({
  procesarLocalizacion: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./servidor.socketio', () => ({
  get ioInstance() {
    return mockIoInstance;
  },
}));

// Mock de ioInstance para rastrear a qué salas se emite
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
let mockIoInstance: { to: jest.Mock } | undefined = { to: mockTo };

const mockDispositivoRepo = dispositivoRepo as jest.Mocked<typeof dispositivoRepo>;
const mockRedisRepo = redisRepositorio as jest.Mocked<typeof redisRepositorio>;

/**
 * Arbitrary: genera un UUID v4 válido
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary: genera un ID de usuario propietario (positivo)
 */
const idPropietarioArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera un conjunto de IDs de otros usuarios distintos al propietario
 */
function otrosUsuariosArb(idPropietario: number) {
  return fc.array(
    fc.integer({ min: 1, max: 100000 }).filter((id) => id !== idPropietario),
    { minLength: 1, maxLength: 5 }
  );
}

/**
 * Arbitrary: genera un ID de dispositivo positivo
 */
const idDispositivoArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera coordenadas de localización válidas
 */
const localizacionArb = fc.record({
  latitud: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  longitud: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
  altitud: fc.double({ min: -500, max: 9000, noNaN: true, noDefaultInfinity: true }),
});

describe('Property Test — Eventos Socket.io solo al propietario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIoInstance = { to: mockTo };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 15a: Al actualizar localización, el evento se emite SOLO a la sala del propietario', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idPropietarioArb,
        idDispositivoArb,
        localizacionArb,
        async (uuid, idPropietario, idDispositivo, localizacion) => {
          jest.clearAllMocks();

          // Simular dispositivo existente con un propietario específico
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idPropietario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Simular estado existente en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
            estadoConexion: 'conectado',
            localizacion: null,
            estado: '',
            alarma: '',
            estadoDirecto: '',
          });
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          // Construir topic y mensaje MQTT válidos
          const topic = `dispositivos/${uuid}/localizacion`;
          const mensaje = Buffer.from(JSON.stringify(localizacion));

          await onPublicacion(topic, mensaje);

          // PROPIEDAD (Req 10.2): El evento se emite al propietario
          expect(mockTo).toHaveBeenCalled();

          // PROPIEDAD: TODAS las emisiones van dirigidas a la sala del propietario
          const llamadasTo = mockTo.mock.calls as unknown[][];
          for (const call of llamadasTo) {
            expect(call[0]).toBe(`usuario:${idPropietario}`);
          }

          // PROPIEDAD: El evento emitido es "localizacion:actualizada" con los datos del dispositivo
          expect(mockEmit).toHaveBeenCalledTimes(1);
          const emitArgs = mockEmit.mock.calls[0] as unknown[];
          expect(emitArgs[0]).toBe('localizacion:actualizada');

          const datosEmitidos = emitArgs[1] as Record<string, unknown>;
          expect(datosEmitidos.dispositivoId).toBe(idDispositivo);
          // Las coordenadas pasan por JSON roundtrip (stringify + parse), por lo que
          // -0 se convierte en 0. Verificamos igualdad numérica (== trata -0 y 0 como iguales)
          expect(Number(datosEmitidos.latitud) == localizacion.latitud).toBe(true);
          expect(Number(datosEmitidos.longitud) == localizacion.longitud).toBe(true);
          expect(Number(datosEmitidos.altitud) == localizacion.altitud).toBe(true);
          expect(typeof datosEmitidos.timestamp).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15b: Al cambiar estado de conexión (conectar), el evento se emite SOLO al propietario y no a otros usuarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idPropietarioArb,
        idDispositivoArb,
        async (uuid, idPropietario, idDispositivo) => {
          jest.clearAllMocks();

          // Simular dispositivo existente con un propietario específico
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idPropietario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Estado existente en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
            estadoConexion: 'desconectado',
            localizacion: null,
            estado: '',
            alarma: '',
            estadoDirecto: '',
          });
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onConexion(uuid);

          // PROPIEDAD (Req 11.3): El evento se emite exclusivamente al propietario
          expect(mockTo).toHaveBeenCalled();

          // Verificar que TODAS las emisiones van a la sala del propietario
          const llamadasTo = mockTo.mock.calls as unknown[][];
          for (const call of llamadasTo) {
            expect(call[0]).toBe(`usuario:${idPropietario}`);
          }

          // PROPIEDAD: El evento contiene el estado correcto
          expect(mockEmit).toHaveBeenCalledWith('dispositivo:estado', {
            dispositivoId: idDispositivo,
            estadoConexion: 'conectado',
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15c: Al cambiar estado de conexión (desconectar), el evento se emite SOLO al propietario y no a otros usuarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idPropietarioArb,
        idDispositivoArb,
        async (uuid, idPropietario, idDispositivo) => {
          jest.clearAllMocks();

          // Simular dispositivo existente con un propietario específico
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idPropietario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Estado existente en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
            estadoConexion: 'conectado',
            localizacion: null,
            estado: '',
            alarma: '',
            estadoDirecto: '',
          });
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onDesconexion(uuid);

          // PROPIEDAD (Req 11.3): El evento se emite exclusivamente al propietario
          expect(mockTo).toHaveBeenCalled();

          // Verificar que TODAS las emisiones van a la sala del propietario
          const llamadasTo = mockTo.mock.calls as unknown[][];
          for (const call of llamadasTo) {
            expect(call[0]).toBe(`usuario:${idPropietario}`);
          }

          // PROPIEDAD: El evento contiene el estado correcto
          expect(mockEmit).toHaveBeenCalledWith('dispositivo:estado', {
            dispositivoId: idDispositivo,
            estadoConexion: 'desconectado',
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15d: Para múltiples propietarios distintos, cada evento va únicamente a su respectivo propietario', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idPropietarioArb,
        idDispositivoArb,
        fc.integer({ min: 1, max: 100000 }),
        async (uuid, idPropietario, idDispositivo, otroUsuarioId) => {
          // Asegurar que otroUsuario es diferente al propietario
          const otroUsuario = otroUsuarioId === idPropietario ? idPropietario + 1 : otroUsuarioId;

          jest.clearAllMocks();

          // Simular dispositivo del propietario
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idPropietario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
            estadoConexion: 'desconectado',
            localizacion: null,
            estado: '',
            alarma: '',
            estadoDirecto: '',
          });
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onConexion(uuid);

          // PROPIEDAD: El evento NUNCA se emite a la sala de otro usuario
          const llamadasTo = mockTo.mock.calls as unknown[][];
          for (const call of llamadasTo) {
            expect(call[0]).not.toBe(`usuario:${otroUsuario}`);
          }

          // PROPIEDAD: El evento SÍ se emite a la sala del propietario
          expect(mockTo).toHaveBeenCalledWith(`usuario:${idPropietario}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
