/**
 * Property 2: Validación de registro rechaza datos inválidos
 *
 * Para cualquier solicitud de registro donde el UUID de pre-dispositivo no existe
 * o ya está vinculado, o donde el alias o correo ya están registrados, el sistema
 * debe rechazar la operación sin modificar el estado de la base de datos y responder
 * con el código de error apropiado (400 o 409).
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */

import fc from 'fast-check';
import { ErrorHttp } from '../utilidades/error-http';
import type { PreDispositivo } from '../repositorios/pre-dispositivo.repositorio';
import type { Usuario } from '../repositorios/usuario.repositorio';

// Mocks de repositorios
jest.mock('../repositorios/pre-dispositivo.repositorio');
jest.mock('../repositorios/usuario.repositorio');
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('bcrypt');

import * as preDispositivoRepo from '../repositorios/pre-dispositivo.repositorio';
import * as usuarioRepo from '../repositorios/usuario.repositorio';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { registrar, type RegistroRequest } from './autenticacion.servicio';

const mockBuscarPorUuid = preDispositivoRepo.buscarPorUuid as jest.MockedFunction<typeof preDispositivoRepo.buscarPorUuid>;
const mockEstaVinculado = preDispositivoRepo.estaVinculado as jest.MockedFunction<typeof preDispositivoRepo.estaVinculado>;
const mockBuscarPorAlias = usuarioRepo.buscarPorAlias as jest.MockedFunction<typeof usuarioRepo.buscarPorAlias>;
const mockBuscarPorCorreo = usuarioRepo.buscarPorCorreo as jest.MockedFunction<typeof usuarioRepo.buscarPorCorreo>;
const mockCrearUsuario = usuarioRepo.crearUsuario as jest.MockedFunction<typeof usuarioRepo.crearUsuario>;
const mockCrearDispositivo = dispositivoRepo.crearDispositivo as jest.MockedFunction<typeof dispositivoRepo.crearDispositivo>;

// --- Generators ---

/** Genera un UUID v4 válido como string */
const uuidArb = fc.uuid().map((u) => u.toLowerCase());

/** Genera un alias no vacío (alfanumérico 3-50 chars) */
const aliasArb = fc.stringMatching(/^[a-z][a-z0-9]{2,49}$/);

/** Genera un correo no vacío */
const correoArb = fc.emailAddress();

/** Genera una contraseña no vacía (6-50 chars) */
const contrasenaArb = fc.string({ minLength: 6, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Genera un teléfono no vacío (10 dígitos) */
const telefonoArb = fc.stringMatching(/^[0-9]{10}$/);

/** Genera datos de registro válidos */
const registroValidoArb = fc.record({
  uuidPreDispositivo: uuidArb,
  alias: aliasArb,
  correo: correoArb,
  contrasena: contrasenaArb,
  telefono: telefonoArb,
});

/**
 * Enum de escenarios inválidos que deben ser rechazados.
 */
enum EscenarioInvalido {
  UUID_NO_EXISTE = 'uuid_no_existe',
  UUID_YA_VINCULADO = 'uuid_ya_vinculado',
  ALIAS_DUPLICADO = 'alias_duplicado',
  CORREO_DUPLICADO = 'correo_duplicado',
}

const escenarioArb = fc.constantFrom(
  EscenarioInvalido.UUID_NO_EXISTE,
  EscenarioInvalido.UUID_YA_VINCULADO,
  EscenarioInvalido.ALIAS_DUPLICADO,
  EscenarioInvalido.CORREO_DUPLICADO
);

// --- Helpers ---

const preDispositivoMock: PreDispositivo = {
  id: 10,
  uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  creado_en: new Date('2024-01-01'),
};

const usuarioExistenteMock: Usuario = {
  id: 1,
  alias: 'existente',
  correo: 'existente@correo.com',
  contrasena: '$2b$10$hash',
  estatus: 1,
  creado_en: new Date('2024-01-01'),
};

function configurarEscenario(escenario: EscenarioInvalido): void {
  // Reset all mocks to clean state
  mockBuscarPorUuid.mockReset();
  mockEstaVinculado.mockReset();
  mockBuscarPorAlias.mockReset();
  mockBuscarPorCorreo.mockReset();
  mockCrearUsuario.mockReset();
  mockCrearDispositivo.mockReset();

  switch (escenario) {
    case EscenarioInvalido.UUID_NO_EXISTE:
      // Pre-dispositivo no existe
      mockBuscarPorUuid.mockResolvedValue(null);
      break;

    case EscenarioInvalido.UUID_YA_VINCULADO:
      // Pre-dispositivo existe pero ya está vinculado
      mockBuscarPorUuid.mockResolvedValue(preDispositivoMock);
      mockEstaVinculado.mockResolvedValue(true);
      break;

    case EscenarioInvalido.ALIAS_DUPLICADO:
      // Pre-dispositivo válido, pero alias ya existe
      mockBuscarPorUuid.mockResolvedValue(preDispositivoMock);
      mockEstaVinculado.mockResolvedValue(false);
      mockBuscarPorAlias.mockResolvedValue(usuarioExistenteMock);
      mockBuscarPorCorreo.mockResolvedValue(null);
      break;

    case EscenarioInvalido.CORREO_DUPLICADO:
      // Pre-dispositivo válido, alias único, pero correo ya existe
      mockBuscarPorUuid.mockResolvedValue(preDispositivoMock);
      mockEstaVinculado.mockResolvedValue(false);
      mockBuscarPorAlias.mockResolvedValue(null);
      mockBuscarPorCorreo.mockResolvedValue(usuarioExistenteMock);
      break;
  }
}

function codigoEsperado(escenario: EscenarioInvalido): number {
  switch (escenario) {
    case EscenarioInvalido.UUID_NO_EXISTE:
    case EscenarioInvalido.UUID_YA_VINCULADO:
      return 400;
    case EscenarioInvalido.ALIAS_DUPLICADO:
    case EscenarioInvalido.CORREO_DUPLICADO:
      return 409;
  }
}

// --- Property Tests ---

describe('Property 2: Validación de registro rechaza datos inválidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe rechazar con código 400 o 409 según el escenario inválido', async () => {
    await fc.assert(
      fc.asyncProperty(
        registroValidoArb,
        escenarioArb,
        async (datos: RegistroRequest, escenario: EscenarioInvalido) => {
          configurarEscenario(escenario);

          let errorCapturado: ErrorHttp | undefined;
          try {
            await registrar(datos);
          } catch (error) {
            errorCapturado = error as ErrorHttp;
          }

          // Debe lanzar un ErrorHttp
          expect(errorCapturado).toBeDefined();
          expect(errorCapturado).toBeInstanceOf(ErrorHttp);

          // Debe tener el código apropiado
          const esperado = codigoEsperado(escenario);
          expect(errorCapturado!.codigo).toBe(esperado);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no debe modificar la base de datos cuando rechaza la solicitud (no crear usuario ni dispositivo)', async () => {
    await fc.assert(
      fc.asyncProperty(
        registroValidoArb,
        escenarioArb,
        async (datos: RegistroRequest, escenario: EscenarioInvalido) => {
          configurarEscenario(escenario);

          try {
            await registrar(datos);
          } catch {
            // Error esperado
          }

          // Nunca se debe llamar a crearUsuario ni crearDispositivo
          expect(mockCrearUsuario).not.toHaveBeenCalled();
          expect(mockCrearDispositivo).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
