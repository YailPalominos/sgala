/**
 * Property-Based Test: Formato de URL Google Maps
 *
 * **Validates: Requirements 8.3**
 *
 * Para cualquier par de coordenadas (latitud, longitud) válidas,
 * la URL generada debe tener exactamente el formato:
 * `https://www.google.com/maps?q={latitud},{longitud}`
 */
import fc from 'fast-check';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';
import type { EstadoDispositivoRedis } from '../repositorios/redis.repositorio';

// Mocks de repositorios
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/localizacion.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('../utilidades/distancia.util');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionRepo from '../repositorios/localizacion.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { obtenerEnlaceMapa } from './dispositivo.servicio';

const mockBuscarPorId = dispositivoRepo.buscarPorId as jest.MockedFunction<typeof dispositivoRepo.buscarPorId>;
const mockObtenerUltima = localizacionRepo.obtenerUltima as jest.MockedFunction<typeof localizacionRepo.obtenerUltima>;
const mockObtenerEstadoDispositivo = redisRepositorio.obtenerEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.obtenerEstadoDispositivo>;

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

describe('Property Test — Formato de URL Google Maps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 12: Para coordenadas arbitrarias válidas, la URL tiene formato exacto https://www.google.com/maps?q={lat},{lng}', async () => {
    await fc.assert(
      fc.asyncProperty(
        latitudArb,
        longitudArb,
        altitudArb,
        async (latitud, longitud, altitud) => {
          jest.clearAllMocks();

          const idDispositivo = 1;
          const idUsuario = 1;

          // Configurar dispositivo perteneciente al usuario
          const dispositivo: Dispositivo = {
            id: idDispositivo,
            uuid: '00000000-0000-0000-0000-000000000001',
            id_usuario: idUsuario,
            id_pre_dispositivo: 1,
            telefono: '5551234567',
            creado_en: new Date('2024-01-01'),
          };
          mockBuscarPorId.mockResolvedValue(dispositivo);

          // Redis tiene localización con las coordenadas generadas
          const estadoRedis: EstadoDispositivoRedis = {
            estadoConexion: 'conectado',
            localizacion: {
              latitud,
              longitud,
              altitud,
            },
            estado: '',
            alarma: '',
            estadoDirecto: '',
          };
          mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedis);

          // Ejecutar
          const resultado = await obtenerEnlaceMapa(idDispositivo, idUsuario);

          // PROPIEDAD: La URL tiene el formato exacto esperado
          const urlEsperada = `https://www.google.com/maps?q=${latitud},${longitud}`;
          expect(resultado.url).toBe(urlEsperada);

          // PROPIEDAD: La URL comienza con el prefijo correcto
          expect(resultado.url.startsWith('https://www.google.com/maps?q=')).toBe(true);

          // PROPIEDAD: La URL contiene las coordenadas separadas por coma
          const partesCoordenadas = resultado.url.replace('https://www.google.com/maps?q=', '');
          const [latStr, lngStr] = partesCoordenadas.split(',');
          expect(Number(latStr)).toBe(latitud);
          expect(Number(lngStr)).toBe(longitud);
        }
      ),
      { numRuns: 100 }
    );
  });
});
