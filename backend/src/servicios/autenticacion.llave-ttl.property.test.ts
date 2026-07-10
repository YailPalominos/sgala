/**
 * Property 8: Llave de recuperación con TTL correcto
 *
 * Para cualquier solicitud de recuperación con un correo existente, el sistema debe
 * generar una llave en Redis con TTL de exactamente 180 segundos vinculada al
 * identificador del usuario.
 *
 * **Validates: Requirements 5.3**
 */
import fc from 'fast-check';
import type { Usuario } from '../repositorios/usuario.repositorio';

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
jest.mock('bcrypt');
jest.mock('uuid');

import * as usuarioRepo from '../repositorios/usuario.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { enviarCorreoRecuperacion } from './correo.servicio';
import { solicitarRecuperacion } from './autenticacion.servicio';

const mockBuscarPorCorreo = usuarioRepo.buscarPorCorreo as jest.MockedFunction<typeof usuarioRepo.buscarPorCorreo>;
const mockGuardarLlaveRecuperacion = redisRepositorio.guardarLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.guardarLlaveRecuperacion>;
const mockEnviarCorreo = enviarCorreoRecuperacion as jest.MockedFunction<typeof enviarCorreoRecuperacion>;

/**
 * Arbitrary: genera un correo electrónico válido
 */
const correoArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io')
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

/**
 * Arbitrary: genera un id de usuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary: genera un alias válido
 */
const aliasArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/);

describe('Property 8: Llave de recuperación con TTL correcto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('para correo existente, guardarLlaveRecuperacion es invocado con TTL=180 y el idUsuario correcto', async () => {
    const { v4: uuidv4 } = require('uuid') as { v4: jest.Mock };

    await fc.assert(
      fc.asyncProperty(
        correoArb,
        idUsuarioArb,
        aliasArb,
        fc.uuid(),
        async (correo, idUsuario, alias, llaveGenerada) => {
          // Clear mocks between iterations
          mockBuscarPorCorreo.mockReset();
          mockGuardarLlaveRecuperacion.mockReset();
          mockEnviarCorreo.mockReset();

          // Arrange: usuario existente en BD
          const usuarioExistente: Usuario = {
            id: idUsuario,
            alias,
            correo,
            contrasena: '$2b$10$hash_simulado',
            estatus: 1,
            creado_en: new Date(),
          };

          mockBuscarPorCorreo.mockResolvedValue(usuarioExistente);
          uuidv4.mockReturnValue(llaveGenerada);
          mockGuardarLlaveRecuperacion.mockResolvedValue(undefined);
          mockEnviarCorreo.mockResolvedValue(undefined);

          // Act
          await solicitarRecuperacion(correo);

          // Assert: guardarLlaveRecuperacion fue invocado con la llave generada,
          // el idUsuario del usuario encontrado y TTL exactamente 180
          expect(mockGuardarLlaveRecuperacion).toHaveBeenCalledTimes(1);
          expect(mockGuardarLlaveRecuperacion).toHaveBeenCalledWith(
            llaveGenerada,
            idUsuario,
            180
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('la llave generada está vinculada al id del usuario encontrado por correo', async () => {
    const { v4: uuidv4 } = require('uuid') as { v4: jest.Mock };

    await fc.assert(
      fc.asyncProperty(
        correoArb,
        idUsuarioArb,
        aliasArb,
        fc.uuid(),
        async (correo, idUsuario, alias, llaveGenerada) => {
          // Clear mocks between iterations
          mockBuscarPorCorreo.mockReset();
          mockGuardarLlaveRecuperacion.mockReset();
          mockEnviarCorreo.mockReset();

          // Arrange
          const usuarioExistente: Usuario = {
            id: idUsuario,
            alias,
            correo,
            contrasena: '$2b$10$hash_simulado',
            estatus: 1,
            creado_en: new Date(),
          };

          mockBuscarPorCorreo.mockResolvedValue(usuarioExistente);
          uuidv4.mockReturnValue(llaveGenerada);
          mockGuardarLlaveRecuperacion.mockResolvedValue(undefined);
          mockEnviarCorreo.mockResolvedValue(undefined);

          // Act
          await solicitarRecuperacion(correo);

          // Assert: el segundo argumento (idUsuario) coincide con el id del usuario
          // que fue encontrado por buscarPorCorreo
          const [llaveUsada, idUsuarioUsado, ttlUsado] = mockGuardarLlaveRecuperacion.mock.calls[0];
          expect(llaveUsada).toBe(llaveGenerada);
          expect(idUsuarioUsado).toBe(usuarioExistente.id);
          expect(ttlUsado).toBe(180);
        }
      ),
      { numRuns: 100 }
    );
  });
});
