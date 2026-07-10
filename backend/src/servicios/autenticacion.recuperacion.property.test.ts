/**
 * Property 7: Anti-enumeración en recuperación de contraseña
 *
 * Para cualquier dirección de correo electrónico enviada en la solicitud de recuperación
 * (exista o no en la base de datos), el sistema debe responder con código HTTP 200 y
 * la respuesta debe ser indistinguible entre ambos casos.
 *
 * **Validates: Requirements 5.1, 5.2, 5.5**
 */
import * as fc from 'fast-check';
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
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { enviarCorreoRecuperacion } from './correo.servicio';
import { solicitarRecuperacion } from './autenticacion.servicio';

const mockBuscarPorCorreo = usuarioRepo.buscarPorCorreo as jest.MockedFunction<typeof usuarioRepo.buscarPorCorreo>;
const mockGuardarLlave = redisRepositorio.guardarLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.guardarLlaveRecuperacion>;
const mockEnviarCorreo = enviarCorreoRecuperacion as jest.MockedFunction<typeof enviarCorreoRecuperacion>;

describe('Property 7: Anti-enumeración en recuperación de contraseña', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuardarLlave.mockResolvedValue(undefined);
    mockEnviarCorreo.mockResolvedValue(undefined);
  });

  /**
   * Arbitrary que genera direcciones de correo electrónico arbitrarias.
   */
  const correoArb = fc.emailAddress();

  /**
   * Genera un usuario existente con datos aleatorios.
   */
  const usuarioArb = fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    alias: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    correo: fc.emailAddress(),
    contrasena: fc.constant('$2b$10$hashalmacenado'),
    estatus: fc.constant(1),
    creado_en: fc.constant(new Date('2024-01-01')),
  }) as fc.Arbitrary<Usuario>;

  it('debe completar sin error (retorno void) para correos que NO existen en la base de datos', async () => {
    await fc.assert(
      fc.asyncProperty(correoArb, async (correo) => {
        // Simular que el correo no existe
        mockBuscarPorCorreo.mockResolvedValue(null);

        // solicitarRecuperacion debe completar sin lanzar error
        const resultado = await solicitarRecuperacion(correo);

        // Debe retornar undefined (void) — sin error
        expect(resultado).toBeUndefined();

        // No debe intentar guardar llave ni enviar correo cuando el usuario no existe
        expect(mockGuardarLlave).not.toHaveBeenCalled();
        expect(mockEnviarCorreo).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('debe completar sin error (retorno void) para correos que SÍ existen en la base de datos', async () => {
    await fc.assert(
      fc.asyncProperty(usuarioArb, async (usuario) => {
        // Simular que el correo existe
        mockBuscarPorCorreo.mockResolvedValue(usuario);

        // solicitarRecuperacion debe completar sin lanzar error
        const resultado = await solicitarRecuperacion(usuario.correo);

        // Debe retornar undefined (void) — sin error
        expect(resultado).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('debe producir un resultado indistinguible entre correo existente y no existente', async () => {
    await fc.assert(
      fc.asyncProperty(correoArb, usuarioArb, async (correoInexistente, usuario) => {
        // Caso 1: correo NO existe
        mockBuscarPorCorreo.mockResolvedValue(null);
        let resultadoInexistente: any;
        let errorInexistente: any = null;
        try {
          resultadoInexistente = await solicitarRecuperacion(correoInexistente);
        } catch (e) {
          errorInexistente = e;
        }

        jest.clearAllMocks();
        mockGuardarLlave.mockResolvedValue(undefined);
        mockEnviarCorreo.mockResolvedValue(undefined);

        // Caso 2: correo SÍ existe
        mockBuscarPorCorreo.mockResolvedValue(usuario);
        let resultadoExistente: any;
        let errorExistente: any = null;
        try {
          resultadoExistente = await solicitarRecuperacion(usuario.correo);
        } catch (e) {
          errorExistente = e;
        }

        // Ambos casos deben completar sin error
        expect(errorInexistente).toBeNull();
        expect(errorExistente).toBeNull();

        // Ambos deben retornar el mismo valor (undefined/void)
        expect(resultadoInexistente).toBe(resultadoExistente);

        // El tipo de retorno debe ser idéntico (undefined)
        expect(typeof resultadoInexistente).toBe(typeof resultadoExistente);
      }),
      { numRuns: 100 }
    );
  });

  it('la respuesta HTTP del endpoint es siempre 200 independientemente del correo — simulación a nivel recurso', async () => {
    /**
     * Este test simula el comportamiento del endpoint POST /api/auth/recuperacion/solicitar
     * verificando que el servicio nunca lanza un error para correos inexistentes,
     * lo cual garantiza que el recurso siempre responderá HTTP 200.
     *
     * La lógica del recurso es:
     *   await autenticacionServicio.solicitarRecuperacion(correo);
     *   res.status(200).json({ mensaje: '...' });
     *
     * Si solicitarRecuperacion no lanza error → el recurso responde 200.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Caso: correo que no existe
          fc.record({ correo: correoArb, existe: fc.constant(false) }),
          // Caso: correo que sí existe
          fc.record({ correo: correoArb, existe: fc.constant(true) })
        ),
        usuarioArb,
        async ({ correo, existe }, usuario) => {
          if (existe) {
            mockBuscarPorCorreo.mockResolvedValue({ ...usuario, correo });
          } else {
            mockBuscarPorCorreo.mockResolvedValue(null);
          }
          mockGuardarLlave.mockResolvedValue(undefined);
          mockEnviarCorreo.mockResolvedValue(undefined);

          // El servicio NUNCA debe lanzar un error para la solicitud de recuperación
          // (independientemente de si el correo existe o no)
          let lanzaError = false;
          try {
            await solicitarRecuperacion(correo);
          } catch {
            lanzaError = true;
          }

          // Propiedad principal: nunca lanza error → recurso siempre responde 200
          expect(lanzaError).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
