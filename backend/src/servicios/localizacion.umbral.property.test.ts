/**
 * Property-Based Test: Umbral de distancia para persistencia de localización
 *
 * **Validates: Requirements 9.3, 9.4, 9.5, 9.6**
 *
 * Para cualquier par de localizaciones (anterior persistida, nueva recibida):
 * - Si la distancia Haversine entre ambas es >= 50 metros: se inserta en BD
 * - Si la distancia es < 50 metros: no se inserta en BD
 * - Si no existe localización previa en BD: siempre se inserta (primera localización)
 */
import fc from 'fast-check';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';
import type { Localizacion } from '../repositorios/localizacion.repositorio';
import type { EstadoDispositivoRedis } from '../repositorios/redis.repositorio';

// Mocks de repositorios y utilidades
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/localizacion.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('../utilidades/distancia.util');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionRepo from '../repositorios/localizacion.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { calcularDistanciaHaversine } from '../utilidades/distancia.util';
import { procesarLocalizacion } from './localizacion.servicio';

const mockBuscarPorUuid = dispositivoRepo.buscarPorUuid as jest.MockedFunction<typeof dispositivoRepo.buscarPorUuid>;
const mockObtenerUltima = localizacionRepo.obtenerUltima as jest.MockedFunction<typeof localizacionRepo.obtenerUltima>;
const mockInsertar = localizacionRepo.insertar as jest.MockedFunction<typeof localizacionRepo.insertar>;
const mockObtenerEstadoDispositivo = redisRepositorio.obtenerEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.obtenerEstadoDispositivo>;
const mockGuardarEstadoDispositivo = redisRepositorio.guardarEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.guardarEstadoDispositivo>;
const mockCalcularDistancia = calcularDistanciaHaversine as jest.MockedFunction<typeof calcularDistanciaHaversine>;

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
 * Arbitrary: genera un ID de dispositivo positivo
 */
const idDispositivoArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera una distancia >= 50 metros (umbral para inserción)
 */
const distanciaIgualOSuperiorUmbralArb = fc.double({ min: 50, max: 1000000, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera una distancia < 50 metros (bajo umbral, no se inserta)
 */
const distanciaInferiorUmbralArb = fc.double({ min: 0, max: 49.999999, noNaN: true, noDefaultInfinity: true });

/**
 * Helper: crea un dispositivo mock
 */
function crearDispositivoMock(id: number, uuid: string): Dispositivo {
  return {
    id,
    uuid,
    id_usuario: 1,
    id_pre_dispositivo: 1,
    telefono: '5551234567',
    creado_en: new Date('2024-01-01'),
  };
}

describe('Property Test — Umbral de distancia para persistencia de localización', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuardarEstadoDispositivo.mockResolvedValue(undefined);
    mockInsertar.mockResolvedValue(undefined);
  });

  it('Property 13 (Escenario 1): Distancia >= 50m entre localización previa y nueva → se inserta en BD', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        latitudArb,
        longitudArb,
        altitudArb,
        latitudArb,
        longitudArb,
        altitudArb,
        distanciaIgualOSuperiorUmbralArb,
        async (idDisp, uuid, latPrev, lngPrev, altPrev, latNueva, lngNueva, altNueva, distancia) => {
          jest.clearAllMocks();
          mockGuardarEstadoDispositivo.mockResolvedValue(undefined);
          mockInsertar.mockResolvedValue(undefined);

          // Dispositivo existe
          const dispositivo = crearDispositivoMock(idDisp, uuid);
          mockBuscarPorUuid.mockResolvedValue(dispositivo);

          // Estado en Redis (no afecta la decisión de persistencia)
          mockObtenerEstadoDispositivo.mockResolvedValue(null);

          // Hay localización previa en BD
          const locPreviaDB: Localizacion = {
            id: 1,
            id_dispositivo: idDisp,
            latitud: latPrev,
            longitud: lngPrev,
            altitud: altPrev,
            creado_en: new Date('2024-01-10'),
          };
          mockObtenerUltima.mockResolvedValue(locPreviaDB);

          // Distancia calculada >= 50m
          mockCalcularDistancia.mockReturnValue(distancia);

          // Ejecutar
          await procesarLocalizacion(uuid, latNueva, lngNueva, altNueva);

          // PROPIEDAD: Se calcula la distancia con las coordenadas correctas
          expect(mockCalcularDistancia).toHaveBeenCalledWith(latPrev, lngPrev, latNueva, lngNueva);

          // PROPIEDAD: Se inserta en la base de datos
          expect(mockInsertar).toHaveBeenCalledWith(idDisp, latNueva, lngNueva, altNueva);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Escenario 2): Distancia < 50m entre localización previa y nueva → NO se inserta en BD', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        latitudArb,
        longitudArb,
        altitudArb,
        latitudArb,
        longitudArb,
        altitudArb,
        distanciaInferiorUmbralArb,
        async (idDisp, uuid, latPrev, lngPrev, altPrev, latNueva, lngNueva, altNueva, distancia) => {
          jest.clearAllMocks();
          mockGuardarEstadoDispositivo.mockResolvedValue(undefined);
          mockInsertar.mockResolvedValue(undefined);

          // Dispositivo existe
          const dispositivo = crearDispositivoMock(idDisp, uuid);
          mockBuscarPorUuid.mockResolvedValue(dispositivo);

          // Estado en Redis
          mockObtenerEstadoDispositivo.mockResolvedValue(null);

          // Hay localización previa en BD
          const locPreviaDB: Localizacion = {
            id: 1,
            id_dispositivo: idDisp,
            latitud: latPrev,
            longitud: lngPrev,
            altitud: altPrev,
            creado_en: new Date('2024-01-10'),
          };
          mockObtenerUltima.mockResolvedValue(locPreviaDB);

          // Distancia calculada < 50m
          mockCalcularDistancia.mockReturnValue(distancia);

          // Ejecutar
          await procesarLocalizacion(uuid, latNueva, lngNueva, altNueva);

          // PROPIEDAD: Se calcula la distancia
          expect(mockCalcularDistancia).toHaveBeenCalledWith(latPrev, lngPrev, latNueva, lngNueva);

          // PROPIEDAD: NO se inserta en la base de datos
          expect(mockInsertar).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13 (Escenario 3): Sin localización previa en BD → siempre se inserta (primera localización)', async () => {
    await fc.assert(
      fc.asyncProperty(
        idDispositivoArb,
        uuidArb,
        latitudArb,
        longitudArb,
        altitudArb,
        async (idDisp, uuid, latNueva, lngNueva, altNueva) => {
          jest.clearAllMocks();
          mockGuardarEstadoDispositivo.mockResolvedValue(undefined);
          mockInsertar.mockResolvedValue(undefined);

          // Dispositivo existe
          const dispositivo = crearDispositivoMock(idDisp, uuid);
          mockBuscarPorUuid.mockResolvedValue(dispositivo);

          // Estado en Redis
          mockObtenerEstadoDispositivo.mockResolvedValue(null);

          // NO hay localización previa en BD
          mockObtenerUltima.mockResolvedValue(null);

          // Ejecutar
          await procesarLocalizacion(uuid, latNueva, lngNueva, altNueva);

          // PROPIEDAD: NO se calcula distancia (no hay punto de referencia)
          expect(mockCalcularDistancia).not.toHaveBeenCalled();

          // PROPIEDAD: SIEMPRE se inserta en la base de datos (primera localización)
          expect(mockInsertar).toHaveBeenCalledWith(idDisp, latNueva, lngNueva, altNueva);
        }
      ),
      { numRuns: 100 }
    );
  });
});
