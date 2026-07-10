/**
 * Property-Based Test: Listado retorna solo dispositivos del usuario
 *
 * **Validates: Requirements 7.1, 7.3**
 *
 * Para cualquier usuario autenticado con N dispositivos, el listado debe retornar
 * exactamente N dispositivos, todos con id_usuario correspondiente al usuario de la sesión.
 */
import fc from 'fast-check';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';

// Mocks de repositorios y servicios
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('./localizacion.servicio');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionServicio from './localizacion.servicio';
import { listarDispositivosPorUsuario } from './dispositivo.servicio';

const mockListarPorUsuario = dispositivoRepo.listarPorUsuario as jest.MockedFunction<typeof dispositivoRepo.listarPorUsuario>;
const mockObtenerUltimaLocalizacion = localizacionServicio.obtenerUltimaLocalizacion as jest.MockedFunction<typeof localizacionServicio.obtenerUltimaLocalizacion>;

/**
 * Arbitrary: genera un ID de usuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

describe('Property Test — Listado retorna solo dispositivos del usuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 11: Para usuario con N dispositivos, retorna exactamente N resultados todos con id_usuario correcto', async () => {
    await fc.assert(
      fc.asyncProperty(
        idUsuarioArb,
        fc.integer({ min: 0, max: 10 }),
        async (idUsuario, n) => {
          jest.clearAllMocks();

          // Generar N dispositivos que pertenecen al usuario
          const dispositivos: Dispositivo[] = Array.from({ length: n }, (_, i) => ({
            id: i + 1,
            uuid: `uuid-${idUsuario}-${i}`,
            id_usuario: idUsuario,
            id_pre_dispositivo: i + 100,
            telefono: `555000${String(i).padStart(4, '0')}`,
            creado_en: new Date('2024-01-01'),
          }));

          // El repositorio retorna exactamente los dispositivos del usuario
          mockListarPorUsuario.mockResolvedValue(dispositivos);

          // Localización retorna null (no relevante para esta propiedad)
          mockObtenerUltimaLocalizacion.mockResolvedValue(null);

          // Ejecutar
          const resultado = await listarDispositivosPorUsuario(idUsuario);

          // PROPIEDAD 1: El resultado tiene exactamente N elementos
          expect(resultado).toHaveLength(n);

          // PROPIEDAD 2: Cada dispositivo tiene un id que corresponde a los dispositivos del usuario
          for (let i = 0; i < resultado.length; i++) {
            expect(resultado[i].id).toBe(dispositivos[i].id);
            expect(resultado[i].telefono).toBe(dispositivos[i].telefono);
          }

          // PROPIEDAD 3: El repositorio fue consultado con el id del usuario correcto
          expect(mockListarPorUsuario).toHaveBeenCalledWith(idUsuario);
          expect(mockListarPorUsuario).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11 (Escenario 2): El servicio consulta localización para cada dispositivo del usuario', async () => {
    await fc.assert(
      fc.asyncProperty(
        idUsuarioArb,
        fc.integer({ min: 1, max: 10 }),
        async (idUsuario, n) => {
          jest.clearAllMocks();

          // Generar N dispositivos que pertenecen al usuario
          const dispositivos: Dispositivo[] = Array.from({ length: n }, (_, i) => ({
            id: i + 1,
            uuid: `uuid-${idUsuario}-${i}`,
            id_usuario: idUsuario,
            id_pre_dispositivo: i + 100,
            telefono: `555000${String(i).padStart(4, '0')}`,
            creado_en: new Date('2024-01-01'),
          }));

          mockListarPorUsuario.mockResolvedValue(dispositivos);
          mockObtenerUltimaLocalizacion.mockResolvedValue(null);

          // Ejecutar
          const resultado = await listarDispositivosPorUsuario(idUsuario);

          // PROPIEDAD: Se consultó la localización de cada dispositivo
          expect(mockObtenerUltimaLocalizacion).toHaveBeenCalledTimes(n);
          for (const dispositivo of dispositivos) {
            expect(mockObtenerUltimaLocalizacion).toHaveBeenCalledWith(dispositivo.id);
          }

          // PROPIEDAD: Cada resultado incluye los campos requeridos (id, telefono, localizacion)
          for (const item of resultado) {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('telefono');
            expect(item).toHaveProperty('localizacion');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11 (Escenario 3): Usuario sin dispositivos retorna arreglo vacío', async () => {
    await fc.assert(
      fc.asyncProperty(
        idUsuarioArb,
        async (idUsuario) => {
          jest.clearAllMocks();

          // El repositorio retorna un arreglo vacío (0 dispositivos)
          mockListarPorUsuario.mockResolvedValue([]);

          // Ejecutar
          const resultado = await listarDispositivosPorUsuario(idUsuario);

          // PROPIEDAD: El resultado es un arreglo vacío
          expect(resultado).toEqual([]);
          expect(resultado).toHaveLength(0);

          // PROPIEDAD: No se consultó localización para ningún dispositivo
          expect(mockObtenerUltimaLocalizacion).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
