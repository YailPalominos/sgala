/**
 * Property-Based Test: Reflejo de estado de conexión en Redis
 *
 * **Validates: Requirements 11.1, 11.2, 11.4**
 *
 * Para cualquier dispositivo:
 * - Al establecer conexión MQTT: estadoConexion = "conectado" en Redis
 * - Al cerrar la conexión MQTT: estadoConexion = "desconectado" en Redis
 * - Si el Estado no existía previamente en Redis: se crea con campos por defecto
 *   (localizacion: null, estado: '', alarma: '', estadoDirecto: '')
 */
import fc from 'fast-check';
import { onConexion, onDesconexion } from './manejadores.mqtt';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { redisRepositorio, EstadoDispositivoRedis } from '../repositorios/redis.repositorio';

// Mocks
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio', () => ({
  redisRepositorio: {
    obtenerEstadoDispositivo: jest.fn(),
    guardarEstadoDispositivo: jest.fn(),
  },
}));
jest.mock('../socketio/emisor.socketio', () => ({
  emitirAUsuario: jest.fn(),
}));

const mockDispositivoRepo = dispositivoRepo as jest.Mocked<typeof dispositivoRepo>;
const mockRedisRepo = redisRepositorio as jest.Mocked<typeof redisRepositorio>;

/**
 * Arbitrary: genera un UUID v4 válido para dispositivos
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary: genera un ID de usuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera un ID de dispositivo positivo
 */
const idDispositivoArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera coordenadas de localización válidas o null
 */
const localizacionArb = fc.oneof(
  fc.constant(null),
  fc.record({
    latitud: fc.double({ min: -90, max: 90, noNaN: true }),
    longitud: fc.double({ min: -180, max: 180, noNaN: true }),
    altitud: fc.double({ min: -500, max: 50000, noNaN: true }),
  })
);

/**
 * Arbitrary: genera un estado de dispositivo existente en Redis
 */
const estadoExistenteArb = fc.record({
  estadoConexion: fc.constantFrom('conectado' as const, 'desconectado' as const),
  localizacion: localizacionArb,
  estado: fc.string({ maxLength: 50 }),
  alarma: fc.string({ maxLength: 50 }),
  estadoDirecto: fc.string({ maxLength: 50 }),
});

describe('Property Test — Reflejo de estado de conexión en Redis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 16a: Al conectar un dispositivo, estadoConexion se establece a "conectado" en Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idUsuarioArb,
        idDispositivoArb,
        estadoExistenteArb,
        async (uuid, idUsuario, idDispositivo, estadoPrevio) => {
          jest.clearAllMocks();

          // Simular dispositivo existente en BD
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idUsuario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Simular estado previo existente en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue(estadoPrevio);
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onConexion(uuid);

          // PROPIEDAD (Req 11.1): estadoConexion es "conectado"
          expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledTimes(1);
          const [uuidGuardado, estadoGuardado] = mockRedisRepo.guardarEstadoDispositivo.mock.calls[0];
          expect(uuidGuardado).toBe(uuid);
          expect(estadoGuardado.estadoConexion).toBe('conectado');

          // Los demás campos se preservan del estado anterior
          expect(estadoGuardado.localizacion).toEqual(estadoPrevio.localizacion);
          expect(estadoGuardado.estado).toBe(estadoPrevio.estado);
          expect(estadoGuardado.alarma).toBe(estadoPrevio.alarma);
          expect(estadoGuardado.estadoDirecto).toBe(estadoPrevio.estadoDirecto);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16b: Al desconectar un dispositivo, estadoConexion se establece a "desconectado" en Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idUsuarioArb,
        idDispositivoArb,
        estadoExistenteArb,
        async (uuid, idUsuario, idDispositivo, estadoPrevio) => {
          jest.clearAllMocks();

          // Simular dispositivo existente en BD
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idUsuario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Simular estado previo existente en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue(estadoPrevio);
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onDesconexion(uuid);

          // PROPIEDAD (Req 11.2): estadoConexion es "desconectado"
          expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledTimes(1);
          const [uuidGuardado, estadoGuardado] = mockRedisRepo.guardarEstadoDispositivo.mock.calls[0];
          expect(uuidGuardado).toBe(uuid);
          expect(estadoGuardado.estadoConexion).toBe('desconectado');

          // Los demás campos se preservan del estado anterior
          expect(estadoGuardado.localizacion).toEqual(estadoPrevio.localizacion);
          expect(estadoGuardado.estado).toBe(estadoPrevio.estado);
          expect(estadoGuardado.alarma).toBe(estadoPrevio.alarma);
          expect(estadoGuardado.estadoDirecto).toBe(estadoPrevio.estadoDirecto);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16c: Si el Estado no existía en Redis al conectar, se crea con campos por defecto', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        idUsuarioArb,
        idDispositivoArb,
        async (uuid, idUsuario, idDispositivo) => {
          jest.clearAllMocks();

          // Simular dispositivo existente en BD
          mockDispositivoRepo.buscarPorUuid.mockResolvedValue({
            id: idDispositivo,
            uuid,
            id_usuario: idUsuario,
            id_pre_dispositivo: 1,
            telefono: '3001234567',
            creado_en: new Date(),
          });

          // Simular que NO existe estado previo en Redis
          mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue(null);
          mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

          await onConexion(uuid);

          // PROPIEDAD (Req 11.4): Se crea estado con campos por defecto
          expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledTimes(1);
          const [uuidGuardado, estadoGuardado] = mockRedisRepo.guardarEstadoDispositivo.mock.calls[0];
          expect(uuidGuardado).toBe(uuid);
          expect(estadoGuardado).toEqual({
            estadoConexion: 'conectado',
            localizacion: null,
            estado: '',
            alarma: '',
            estadoDirecto: '',
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
