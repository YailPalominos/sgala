/**
 * Property-Based Test: Round-trip del registro de usuario
 *
 * **Validates: Requirements 1.1, 1.3, 1.5**
 *
 * Para cualquier conjunto válido de datos de registro (UUID de pre-dispositivo
 * existente y no vinculado, alias único, correo único, contraseña), al ejecutar
 * el registro el sistema debe producir:
 * - Un usuario en la tabla `usuarios` con `estatus` igual a 1
 * - Una contraseña almacenada diferente al texto plano original
 * - Un registro en la tabla `dispositivos` que vincule al usuario con el pre-dispositivo
 */
import fc from 'fast-check';
import bcrypt from 'bcrypt';
import type { PreDispositivo } from '../repositorios/pre-dispositivo.repositorio';
import type { Usuario } from '../repositorios/usuario.repositorio';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';

// Mocks de repositorios
jest.mock('../repositorios/pre-dispositivo.repositorio');
jest.mock('../repositorios/usuario.repositorio');
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('bcrypt');

import * as preDispositivoRepo from '../repositorios/pre-dispositivo.repositorio';
import * as usuarioRepo from '../repositorios/usuario.repositorio';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { registrar } from './autenticacion.servicio';

const mockBuscarPorUuid = preDispositivoRepo.buscarPorUuid as jest.MockedFunction<typeof preDispositivoRepo.buscarPorUuid>;
const mockEstaVinculado = preDispositivoRepo.estaVinculado as jest.MockedFunction<typeof preDispositivoRepo.estaVinculado>;
const mockBuscarPorAlias = usuarioRepo.buscarPorAlias as jest.MockedFunction<typeof usuarioRepo.buscarPorAlias>;
const mockBuscarPorCorreo = usuarioRepo.buscarPorCorreo as jest.MockedFunction<typeof usuarioRepo.buscarPorCorreo>;
const mockCrearUsuario = usuarioRepo.crearUsuario as jest.MockedFunction<typeof usuarioRepo.crearUsuario>;
const mockCrearDispositivo = dispositivoRepo.crearDispositivo as jest.MockedFunction<typeof dispositivoRepo.crearDispositivo>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

/**
 * Arbitrary: genera un UUID v4 válido
 */
const uuidArb = fc.uuid().filter((u) => u.length > 0);

/**
 * Arbitrary: genera un alias válido (no vacío, alfanumérico, 3-50 caracteres)
 */
const aliasArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{2,49}$/);

/**
 * Arbitrary: genera un correo electrónico válido
 */
const correoArb = fc.tuple(
  fc.stringMatching(/^[a-z]{3,10}$/),
  fc.stringMatching(/^[a-z]{3,10}$/),
  fc.constantFrom('com', 'org', 'net', 'io')
).map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

/**
 * Arbitrary: genera una contraseña válida (no vacía, 8-30 caracteres)
 */
const contrasenaArb = fc.stringMatching(/^[A-Za-z0-9!@#$%]{8,30}$/);

/**
 * Arbitrary: genera un número telefónico (10 dígitos)
 */
const telefonoArb = fc.stringMatching(/^[0-9]{10}$/);

/**
 * Arbitrary: genera un ID numérico positivo
 */
const idArb = fc.integer({ min: 1, max: 100000 });

describe('Property Test — Round-trip del registro de usuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 1: Para datos válidos, el registro produce usuario con estatus=1, contraseña cifrada ≠ texto plano, y dispositivo vinculado al pre-dispositivo', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        aliasArb,
        correoArb,
        contrasenaArb,
        telefonoArb,
        idArb,
        idArb,
        idArb,
        async (uuid, alias, correo, contrasena, telefono, preDispId, usuarioId, dispositivoId) => {
          jest.clearAllMocks();

          // Simular pre-dispositivo existente y no vinculado
          const preDispositivoMock: PreDispositivo = {
            id: preDispId,
            uuid,
            creado_en: new Date('2024-01-01'),
          };
          mockBuscarPorUuid.mockResolvedValue(preDispositivoMock);
          mockEstaVinculado.mockResolvedValue(false);

          // Simular alias y correo únicos (no existentes)
          mockBuscarPorAlias.mockResolvedValue(null);
          mockBuscarPorCorreo.mockResolvedValue(null);

          // Simular cifrado de contraseña — produce un hash diferente al texto plano
          const hashSimulado = `$2b$10$hash_of_${contrasena.substring(0, 5)}`;
          (mockBcryptHash as jest.Mock).mockResolvedValue(hashSimulado);

          // Simular creación de usuario con estatus=1
          const usuarioCreado: Usuario = {
            id: usuarioId,
            alias,
            correo,
            contrasena: hashSimulado,
            estatus: 1,
            creado_en: new Date(),
          };
          mockCrearUsuario.mockResolvedValue(usuarioCreado);

          // Simular creación de dispositivo vinculado
          const dispositivoCreado: Dispositivo = {
            id: dispositivoId,
            uuid: 'nuevo-uuid-dispositivo',
            id_usuario: usuarioId,
            id_pre_dispositivo: preDispId,
            telefono,
            creado_en: new Date(),
          };
          mockCrearDispositivo.mockResolvedValue(dispositivoCreado);

          // Ejecutar el registro
          const resultado = await registrar({
            uuidPreDispositivo: uuid,
            alias,
            correo,
            contrasena,
            telefono,
          });

          // PROPIEDAD 1: El usuario creado tiene estatus = 1
          expect(resultado.usuario.estatus).toBe(1);

          // PROPIEDAD 2: La contraseña almacenada es diferente al texto plano original
          expect(resultado.usuario.contrasena).not.toBe(contrasena);

          // Verificar que bcrypt.hash fue invocado con la contraseña en texto plano y 10 rounds
          expect(mockBcryptHash).toHaveBeenCalledWith(contrasena, 10);

          // PROPIEDAD 3: El dispositivo creado está vinculado al pre-dispositivo correcto
          expect(mockCrearDispositivo).toHaveBeenCalledWith(
            expect.objectContaining({
              id_usuario: usuarioId,
              id_pre_dispositivo: preDispId,
              telefono,
            })
          );

          // Verificar que el dispositivo retornado vincula usuario y pre-dispositivo
          expect(resultado.dispositivo.id_usuario).toBe(usuarioId);
          expect(resultado.dispositivo.id_pre_dispositivo).toBe(preDispId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
