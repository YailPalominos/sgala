/**
 * Property-Based Test: Prioridad de localización Redis → SQL Server
 *
 * **Validates: Requirements 7.2, 7.4, 8.1, 8.2**
 *
 * Para cualquier dispositivo, al consultar su última localización:
 * - Si Redis tiene datos de localización, se retornan sin consultar SQL
 * - Si Redis no tiene datos, se consulta la tabla `localizaciones`
 * - Si ninguna fuente tiene datos, se retorna null
 */
import fc from 'fast-check';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';
import type { Localizacion } from '../repositorios/localizacion.repositorio';
import type { EstadoDispositivoRedis } from '../repositorios/redis.repositorio';

// Mocks de repositorios
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/localizacion.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('../utilidades/distancia.util');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionRepo from '../repositorios/localizacion.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { obtenerUltimaLocalizacion } from './localizacion.servicio';

const mockBuscarPorId = dispositivoRepo.buscarPorId as jest.MockedFunction<typeof dispositivoRepo.buscarPorId>;
const mockObtenerUltima = localizacionRepo.obtenerUltima as jest.MockedFunction<typeof localizacionRepo.obtenerUltima>;
const mockObtenerEstadoDispositivo = redisRepositorio.obtenerEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.obtenerEstadoDispositivo>;

/**
 * Arbitrary: genera un ID de dispositivo positivo
 */
const idDispositivoArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera una latitud válida (-90 a 90)
 */
const latitudArb = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera una longitud válida (-180 a 180)
 */
const longitudArb = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera una altitud válida (-500 a 9000 metros)
 */
const altitudArb = fc.double({ min: -500, max: 9000, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera un UUID de dispositivo
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary: genera coordenadas de localización
 */
const localizacionArb = fc.record({
  latitud: latitudArb,
  longitud: longitudArb,
  altitud: altitudArb,
});

describe('Property Test — Prioridad de localización Redis → SQL Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 10 (Escenario 1): Si Redis tiene localización, se retorna sin consultar SQL', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        localizacionArb,
        async (idDispositivo, uuid, localizacion) => {
          jest.clearAllMocks();

          // Configurar dispositivo existente
          const dispositivo: Dispositivo = {
            id: idDispositivo,
            uuid,
            id_usuario: 1,
            id_pre_dispositivo: 1,
            telefono: '5551234567',
            creado_en: new Date('2024-01-01'),
          };
          mockBuscarPorId.mockResolvedValue(dispositivo);

          // Redis tiene localización
          const estadoRedis: EstadoDispositivoRedis = {
            estadoConexion: 'conectado',
            localizacion: {
              latitud: localizacion.latitud,
              longitud: localizacion.longitud,
              altitud: localizacion.altitud,
            },
            estado: '',
            alarma: '',
            estadoDirecto: '',
          };
          mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedis);

          // Ejecutar
          const resultado = await obtenerUltimaLocalizacion(idDispositivo);

          // PROPIEDAD: Se retorna la localización de Redis
          expect(resultado).toEqual({
            latitud: localizacion.latitud,
            longitud: localizacion.longitud,
            altitud: localizacion.altitud,
          });

          // PROPIEDAD: NO se consulta la base de datos
          expect(mockObtenerUltima).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10 (Escenario 2): Si Redis no tiene datos pero SQL sí, se retorna la localización de SQL', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        localizacionArb,
        fc.constantFrom(null, {
          estadoConexion: 'conectado' as const,
          localizacion: null,
          estado: '',
          alarma: '',
          estadoDirecto: '',
        }),
        async (idDispositivo, uuid, localizacion, estadoRedis) => {
          jest.clearAllMocks();

          // Configurar dispositivo existente
          const dispositivo: Dispositivo = {
            id: idDispositivo,
            uuid,
            id_usuario: 1,
            id_pre_dispositivo: 1,
            telefono: '5551234567',
            creado_en: new Date('2024-01-01'),
          };
          mockBuscarPorId.mockResolvedValue(dispositivo);

          // Redis no tiene localización (null completo o localizacion: null)
          mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedis);

          // SQL Server tiene localización
          const localizacionBD: Localizacion = {
            id: 1,
            id_dispositivo: idDispositivo,
            latitud: localizacion.latitud,
            longitud: localizacion.longitud,
            altitud: localizacion.altitud,
            creado_en: new Date('2024-01-10'),
          };
          mockObtenerUltima.mockResolvedValue(localizacionBD);

          // Ejecutar
          const resultado = await obtenerUltimaLocalizacion(idDispositivo);

          // PROPIEDAD: Se consulta la base de datos
          expect(mockObtenerUltima).toHaveBeenCalledWith(idDispositivo);

          // PROPIEDAD: Se retorna la localización de SQL
          expect(resultado).toEqual({
            latitud: localizacion.latitud,
            longitud: localizacion.longitud,
            altitud: localizacion.altitud,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10 (Escenario 3): Si ni Redis ni SQL tienen datos, se retorna null', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        fc.constantFrom(null, {
          estadoConexion: 'conectado' as const,
          localizacion: null,
          estado: '',
          alarma: '',
          estadoDirecto: '',
        }),
        async (idDispositivo, uuid, estadoRedis) => {
          jest.clearAllMocks();

          // Configurar dispositivo existente
          const dispositivo: Dispositivo = {
            id: idDispositivo,
            uuid,
            id_usuario: 1,
            id_pre_dispositivo: 1,
            telefono: '5551234567',
            creado_en: new Date('2024-01-01'),
          };
          mockBuscarPorId.mockResolvedValue(dispositivo);

          // Redis no tiene localización
          mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedis);

          // SQL Server tampoco tiene localización
          mockObtenerUltima.mockResolvedValue(null);

          // Ejecutar
          const resultado = await obtenerUltimaLocalizacion(idDispositivo);

          // PROPIEDAD: Se consulta la base de datos (fallback)
          expect(mockObtenerUltima).toHaveBeenCalledWith(idDispositivo);

          // PROPIEDAD: Se retorna null
          expect(resultado).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
