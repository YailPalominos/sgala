/**
 * Property 4: Login con credenciales inválidas no revela información
 *
 * Para alias inexistente, estatus=0 o contraseña incorrecta, verificar:
 * código 401, mensaje idéntico en todos los casos (anti-enumeración).
 *
 * **Validates: Requirements 2.2, 2.4**
 */
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import { ErrorHttp } from '../utilidades/error-http';
import type { Usuario } from '../repositorios/usuario.repositorio';

// Mocks de dependencias
jest.mock('../repositorios/pre-dispositivo.repositorio');
jest.mock('../repositorios/usuario.repositorio');
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('./sesion.servicio');
jest.mock('./correo.servicio');
jest.mock('bcrypt');
jest.mock('uuid');

import * as usuarioRepo from '../repositorios/usuario.repositorio';
import { login } from './autenticacion.servicio';

const mockBuscarPorAlias = usuarioRepo.buscarPorAlias as jest.MockedFunction<typeof usuarioRepo.buscarPorAlias>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('Property 4: Login con credenciales inválidas no revela información', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Arbitrary que genera alias arbitrarios (strings no vacíos).
   */
  const aliasArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

  /**
   * Arbitrary que genera contraseñas arbitrarias (strings no vacíos).
   */
  const contrasenaArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

  /**
   * Genera un usuario con estatus=0 (inactivo).
   */
  const usuarioInactivoArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    alias: aliasArb,
    correo: fc.emailAddress(),
    contrasena: fc.constant('$2b$10$hashalmacenado'),
    estatus: fc.constant(0),
    creado_en: fc.constant(new Date('2024-01-01')),
  }) as fc.Arbitrary<Usuario>;

  /**
   * Genera un usuario con estatus=1 (activo) para el caso de contraseña incorrecta.
   */
  const usuarioActivoArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    alias: aliasArb,
    correo: fc.emailAddress(),
    contrasena: fc.constant('$2b$10$hashalmacenado'),
    estatus: fc.constant(1),
    creado_en: fc.constant(new Date('2024-01-01')),
  }) as fc.Arbitrary<Usuario>;

  it('debe retornar código 401 para alias inexistente', async () => {
    await fc.assert(
      fc.asyncProperty(aliasArb, contrasenaArb, async (alias, contrasena) => {
        mockBuscarPorAlias.mockResolvedValue(null);

        try {
          await login(alias, contrasena);
          // Si no lanza, la propiedad falla
          return false;
        } catch (error) {
          expect(error).toBeInstanceOf(ErrorHttp);
          const httpError = error as ErrorHttp;
          expect(httpError.codigo).toBe(401);
          return true;
        }
      }),
      { numRuns: 100 }
    );
  });

  it('debe retornar código 401 para usuario con estatus=0', async () => {
    await fc.assert(
      fc.asyncProperty(usuarioInactivoArb, contrasenaArb, async (usuario, contrasena) => {
        mockBuscarPorAlias.mockResolvedValue(usuario);

        try {
          await login(usuario.alias, contrasena);
          return false;
        } catch (error) {
          expect(error).toBeInstanceOf(ErrorHttp);
          const httpError = error as ErrorHttp;
          expect(httpError.codigo).toBe(401);
          return true;
        }
      }),
      { numRuns: 100 }
    );
  });

  it('debe retornar código 401 para contraseña incorrecta', async () => {
    await fc.assert(
      fc.asyncProperty(usuarioActivoArb, contrasenaArb, async (usuario, contrasena) => {
        mockBuscarPorAlias.mockResolvedValue(usuario);
        (mockBcryptCompare as jest.Mock).mockResolvedValue(false);

        try {
          await login(usuario.alias, contrasena);
          return false;
        } catch (error) {
          expect(error).toBeInstanceOf(ErrorHttp);
          const httpError = error as ErrorHttp;
          expect(httpError.codigo).toBe(401);
          return true;
        }
      }),
      { numRuns: 100 }
    );
  });

  it('debe retornar mensaje de error IDÉNTICO en los tres escenarios de fallo', async () => {
    await fc.assert(
      fc.asyncProperty(
        aliasArb,
        contrasenaArb,
        usuarioInactivoArb,
        usuarioActivoArb,
        async (aliasInexistente, contrasena, usuarioInactivo, usuarioActivo) => {
          // Escenario 1: alias inexistente
          mockBuscarPorAlias.mockResolvedValue(null);
          let errorAlias: ErrorHttp | undefined;
          try {
            await login(aliasInexistente, contrasena);
          } catch (e) {
            errorAlias = e as ErrorHttp;
          }

          // Escenario 2: estatus=0
          mockBuscarPorAlias.mockResolvedValue(usuarioInactivo);
          let errorEstatus: ErrorHttp | undefined;
          try {
            await login(usuarioInactivo.alias, contrasena);
          } catch (e) {
            errorEstatus = e as ErrorHttp;
          }

          // Escenario 3: contraseña incorrecta
          mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
          (mockBcryptCompare as jest.Mock).mockResolvedValue(false);
          let errorContrasena: ErrorHttp | undefined;
          try {
            await login(usuarioActivo.alias, contrasena);
          } catch (e) {
            errorContrasena = e as ErrorHttp;
          }

          // Verificar que los tres errores existen
          expect(errorAlias).toBeDefined();
          expect(errorEstatus).toBeDefined();
          expect(errorContrasena).toBeDefined();

          // Verificar código idéntico (401)
          expect(errorAlias!.codigo).toBe(401);
          expect(errorEstatus!.codigo).toBe(401);
          expect(errorContrasena!.codigo).toBe(401);

          // Verificar mensaje IDÉNTICO en todos los casos (anti-enumeración)
          expect(errorAlias!.mensaje).toBe(errorEstatus!.mensaje);
          expect(errorEstatus!.mensaje).toBe(errorContrasena!.mensaje);
        }
      ),
      { numRuns: 100 }
    );
  });
});
