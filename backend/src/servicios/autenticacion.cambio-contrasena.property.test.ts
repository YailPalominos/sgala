/**
 * Property 9: Round-trip de cambio de contraseña
 *
 * Para cualquier llave de recuperación válida en Redis y una nueva contraseña,
 * después de ejecutar el cambio:
 * - La nueva contraseña cifrada debe permitir un login exitoso para ese usuario
 * - La llave de recuperación ya no debe existir en Redis
 *
 * **Validates: Requirements 6.1, 6.3, 6.4**
 */
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import type { Usuario } from '../repositorios/usuario.repositorio';
import type { RecuperacionRedis } from '../repositorios/redis.repositorio';

// Mocks — deben ir antes de los imports de los módulos mockeados
jest.mock('../configuracion/base-datos', () => ({
  pool: {},
  conexionPool: Promise.resolve({}),
}));
jest.mock('../configuracion/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('../repositorios/pre-dispositivo.repositorio');
jest.mock('../repositorios/usuario.repositorio');
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('./sesion.servicio');
jest.mock('./correo.servicio');

import * as usuarioRepo from '../repositorios/usuario.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { sesionServicio } from './sesion.servicio';
import { cambiarContrasena, login } from './autenticacion.servicio';

const mockObtenerLlaveRecuperacion = redisRepositorio.obtenerLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.obtenerLlaveRecuperacion>;
const mockEliminarLlaveRecuperacion = redisRepositorio.eliminarLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.eliminarLlaveRecuperacion>;
const mockActualizarContrasena = usuarioRepo.actualizarContrasena as jest.MockedFunction<typeof usuarioRepo.actualizarContrasena>;
const mockBuscarPorAlias = usuarioRepo.buscarPorAlias as jest.MockedFunction<typeof usuarioRepo.buscarPorAlias>;
const mockCrearSesion = sesionServicio.crearSesion as jest.MockedFunction<typeof sesionServicio.crearSesion>;

/**
 * Arbitrary: genera una llave de recuperación UUID válida
 */
const llaveArb = fc.uuid();

/**
 * Arbitrary: genera una nueva contraseña válida (entre 6 y 50 chars, sin espacios vacíos)
 */
const nuevaContrasenaArb = fc.string({ minLength: 6, maxLength: 50 }).filter(s => s.trim().length >= 6);

/**
 * Arbitrary: genera un id de usuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera un alias válido
 */
const aliasArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/);

/**
 * Arbitrary: genera un sessionId UUID-like
 */
const sessionIdArb = fc.uuid();

describe('Property 9: Round-trip de cambio de contraseña', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('para llave válida y nueva contraseña, actualiza la contraseña con bcrypt hash y el login posterior con nueva contraseña es exitoso', async () => {
    await fc.assert(
      fc.asyncProperty(
        llaveArb,
        nuevaContrasenaArb,
        idUsuarioArb,
        aliasArb,
        sessionIdArb,
        async (llave, nuevaContrasena, idUsuario, alias, sessionId) => {
          // Arrange: llave de recuperación válida en Redis
          const recuperacion: RecuperacionRedis = { idUsuario };
          mockObtenerLlaveRecuperacion.mockResolvedValue(recuperacion);
          mockEliminarLlaveRecuperacion.mockResolvedValue(undefined);
          mockActualizarContrasena.mockResolvedValue(undefined);

          // Capturamos el hash generado durante cambiarContrasena
          let hashCapturado: string = '';
          mockActualizarContrasena.mockImplementation(async (_id, hash) => {
            hashCapturado = hash;
          });

          // Act: ejecutar cambio de contraseña
          await cambiarContrasena(llave, nuevaContrasena);

          // Assert: actualizarContrasena fue invocado con el idUsuario correcto
          expect(mockActualizarContrasena).toHaveBeenCalledWith(idUsuario, expect.any(String));

          // Assert: el hash almacenado es diferente al texto plano
          expect(hashCapturado).not.toBe(nuevaContrasena);

          // Assert: el hash almacenado es un hash bcrypt válido que coincide con la nueva contraseña
          const coincide = await bcrypt.compare(nuevaContrasena, hashCapturado);
          expect(coincide).toBe(true);

          // Ahora verificamos que login con la nueva contraseña sería exitoso
          // Simulamos el usuario con la contraseña actualizada
          const usuarioActualizado: Usuario = {
            id: idUsuario,
            alias,
            correo: `${alias}@test.com`,
            contrasena: hashCapturado,
            estatus: 1,
            creado_en: new Date(),
          };

          mockBuscarPorAlias.mockResolvedValue(usuarioActualizado);
          mockCrearSesion.mockResolvedValue(sessionId);

          // Act: login con la nueva contraseña
          const resultado = await login(alias, nuevaContrasena);

          // Assert: login exitoso retorna un sessionId
          expect(resultado).toBe(sessionId);
          expect(mockCrearSesion).toHaveBeenCalledWith(idUsuario, alias);
        }
      ),
      // numRuns reducido porque bcrypt real (10 salt rounds) es CPU-intensivo por iteración
      { numRuns: 20 }
    );
  }, 60000);

  it('para llave válida, después de cambiarContrasena la llave es eliminada de Redis', async () => {
    await fc.assert(
      fc.asyncProperty(
        llaveArb,
        nuevaContrasenaArb,
        idUsuarioArb,
        async (llave, nuevaContrasena, idUsuario) => {
          // Arrange: llave de recuperación válida en Redis
          const recuperacion: RecuperacionRedis = { idUsuario };
          mockObtenerLlaveRecuperacion.mockResolvedValue(recuperacion);
          mockEliminarLlaveRecuperacion.mockResolvedValue(undefined);
          mockActualizarContrasena.mockResolvedValue(undefined);

          // Act: ejecutar cambio de contraseña
          await cambiarContrasena(llave, nuevaContrasena);

          // Assert: eliminarLlaveRecuperacion fue invocado con la llave correcta
          expect(mockEliminarLlaveRecuperacion).toHaveBeenCalledWith(llave);

          // Assert: la eliminación ocurre después de actualizar la contraseña
          const ordenActualizar = mockActualizarContrasena.mock.invocationCallOrder[0];
          const ordenEliminar = mockEliminarLlaveRecuperacion.mock.invocationCallOrder[0];
          expect(ordenActualizar).toBeLessThan(ordenEliminar);
        }
      ),
      { numRuns: 100 }
    );
  });
});
