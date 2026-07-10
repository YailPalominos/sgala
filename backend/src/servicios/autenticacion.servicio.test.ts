import bcrypt from 'bcrypt';
import { ErrorHttp } from '../utilidades/error-http';
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
import { registrar, type RegistroRequest } from './autenticacion.servicio';

const mockBuscarPorUuid = preDispositivoRepo.buscarPorUuid as jest.MockedFunction<typeof preDispositivoRepo.buscarPorUuid>;
const mockEstaVinculado = preDispositivoRepo.estaVinculado as jest.MockedFunction<typeof preDispositivoRepo.estaVinculado>;
const mockBuscarPorAlias = usuarioRepo.buscarPorAlias as jest.MockedFunction<typeof usuarioRepo.buscarPorAlias>;
const mockBuscarPorCorreo = usuarioRepo.buscarPorCorreo as jest.MockedFunction<typeof usuarioRepo.buscarPorCorreo>;
const mockCrearUsuario = usuarioRepo.crearUsuario as jest.MockedFunction<typeof usuarioRepo.crearUsuario>;
const mockCrearDispositivo = dispositivoRepo.crearDispositivo as jest.MockedFunction<typeof dispositivoRepo.crearDispositivo>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

describe('Servicio de autenticación — registrar', () => {
  const datosValidos: RegistroRequest = {
    uuidPreDispositivo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    alias: 'juanperez',
    correo: 'juan@correo.com',
    contrasena: 'MiContrasena123',
    telefono: '5551234567',
  };

  const preDispositivoMock: PreDispositivo = {
    id: 10,
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    creado_en: new Date('2024-01-01'),
  };

  const usuarioMock: Usuario = {
    id: 1,
    alias: 'juanperez',
    correo: 'juan@correo.com',
    contrasena: '$2b$10$hashgenerado',
    estatus: 1,
    creado_en: new Date('2024-01-15'),
  };

  const dispositivoMock: Dispositivo = {
    id: 5,
    uuid: 'nuevo-uuid-dispositivo',
    id_usuario: 1,
    id_pre_dispositivo: 10,
    telefono: '5551234567',
    creado_en: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup defaults para flujo exitoso
    mockBuscarPorUuid.mockResolvedValue(preDispositivoMock);
    mockEstaVinculado.mockResolvedValue(false);
    mockBuscarPorAlias.mockResolvedValue(null);
    mockBuscarPorCorreo.mockResolvedValue(null);
    (mockBcryptHash as jest.Mock).mockResolvedValue('$2b$10$hashgenerado');
    mockCrearUsuario.mockResolvedValue(usuarioMock);
    mockCrearDispositivo.mockResolvedValue(dispositivoMock);
  });

  describe('Flujo exitoso', () => {
    it('debe registrar usuario y dispositivo cuando todos los datos son válidos', async () => {
      const resultado = await registrar(datosValidos);

      expect(resultado.usuario).toEqual(usuarioMock);
      expect(resultado.dispositivo).toEqual(dispositivoMock);
    });

    it('debe cifrar la contraseña con bcrypt usando 10 salt rounds', async () => {
      await registrar(datosValidos);

      expect(mockBcryptHash).toHaveBeenCalledWith('MiContrasena123', 10);
    });

    it('debe crear el usuario con la contraseña cifrada y no el texto plano', async () => {
      await registrar(datosValidos);

      expect(mockCrearUsuario).toHaveBeenCalledWith({
        alias: 'juanperez',
        correo: 'juan@correo.com',
        contrasena: '$2b$10$hashgenerado',
      });
    });

    it('debe crear el dispositivo vinculando usuario, pre-dispositivo y teléfono', async () => {
      await registrar(datosValidos);

      expect(mockCrearDispositivo).toHaveBeenCalledWith({
        id_usuario: 1,
        id_pre_dispositivo: 10,
        telefono: '5551234567',
      });
    });

    it('debe seguir el orden correcto: verificar pre-dispositivo → unicidad → cifrar → insertar', async () => {
      const callOrder: string[] = [];
      mockBuscarPorUuid.mockImplementation(async () => { callOrder.push('buscarPreDispositivo'); return preDispositivoMock; });
      mockEstaVinculado.mockImplementation(async () => { callOrder.push('estaVinculado'); return false; });
      mockBuscarPorAlias.mockImplementation(async () => { callOrder.push('buscarAlias'); return null; });
      mockBuscarPorCorreo.mockImplementation(async () => { callOrder.push('buscarCorreo'); return null; });
      (mockBcryptHash as jest.Mock).mockImplementation(async () => { callOrder.push('bcryptHash'); return '$2b$10$hash'; });
      mockCrearUsuario.mockImplementation(async () => { callOrder.push('crearUsuario'); return usuarioMock; });
      mockCrearDispositivo.mockImplementation(async () => { callOrder.push('crearDispositivo'); return dispositivoMock; });

      await registrar(datosValidos);

      expect(callOrder).toEqual([
        'buscarPreDispositivo',
        'estaVinculado',
        'buscarAlias',
        'buscarCorreo',
        'bcryptHash',
        'crearUsuario',
        'crearDispositivo',
      ]);
    });
  });

  describe('Validación de campos requeridos', () => {
    it('debe lanzar ErrorHttp 400 si uuidPreDispositivo está vacío', async () => {
      await expect(registrar({ ...datosValidos, uuidPreDispositivo: '' }))
        .rejects.toThrow(ErrorHttp);
      await expect(registrar({ ...datosValidos, uuidPreDispositivo: '' }))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe lanzar ErrorHttp 400 si alias está vacío', async () => {
      await expect(registrar({ ...datosValidos, alias: '  ' }))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe lanzar ErrorHttp 400 si correo está vacío', async () => {
      await expect(registrar({ ...datosValidos, correo: '' }))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe lanzar ErrorHttp 400 si contrasena está vacía', async () => {
      await expect(registrar({ ...datosValidos, contrasena: '' }))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe lanzar ErrorHttp 400 si telefono está vacío', async () => {
      await expect(registrar({ ...datosValidos, telefono: '' }))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe incluir los nombres de campos faltantes en el mensaje de error', async () => {
      try {
        await registrar({ uuidPreDispositivo: '', alias: '', correo: '', contrasena: '', telefono: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorHttp);
        const httpError = error as ErrorHttp;
        expect(httpError.mensaje).toContain('uuidPreDispositivo');
        expect(httpError.mensaje).toContain('alias');
        expect(httpError.mensaje).toContain('correo');
        expect(httpError.mensaje).toContain('contrasena');
        expect(httpError.mensaje).toContain('telefono');
      }
    });

    it('no debe llamar a los repositorios si hay campos faltantes', async () => {
      try {
        await registrar({ ...datosValidos, alias: '' });
      } catch { /* ignorar */ }

      expect(mockBuscarPorUuid).not.toHaveBeenCalled();
      expect(mockCrearUsuario).not.toHaveBeenCalled();
    });
  });

  describe('Validación de pre-dispositivo', () => {
    it('debe lanzar ErrorHttp 400 si el UUID de pre-dispositivo no existe', async () => {
      mockBuscarPorUuid.mockResolvedValue(null);

      await expect(registrar(datosValidos))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('debe lanzar ErrorHttp 400 si el pre-dispositivo ya está vinculado', async () => {
      mockEstaVinculado.mockResolvedValue(true);

      await expect(registrar(datosValidos))
        .rejects.toMatchObject({ codigo: 400 });
    });

    it('no debe verificar unicidad si el pre-dispositivo es inválido', async () => {
      mockBuscarPorUuid.mockResolvedValue(null);

      try {
        await registrar(datosValidos);
      } catch { /* ignorar */ }

      expect(mockBuscarPorAlias).not.toHaveBeenCalled();
      expect(mockBuscarPorCorreo).not.toHaveBeenCalled();
    });
  });

  describe('Validación de unicidad de alias y correo', () => {
    it('debe lanzar ErrorHttp 409 si el alias ya existe', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioMock);

      await expect(registrar(datosValidos))
        .rejects.toMatchObject({ codigo: 409 });
    });

    it('debe lanzar ErrorHttp 409 si el correo ya existe', async () => {
      mockBuscarPorCorreo.mockResolvedValue(usuarioMock);

      await expect(registrar(datosValidos))
        .rejects.toMatchObject({ codigo: 409 });
    });

    it('no debe cifrar ni insertar si hay duplicado de alias', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioMock);

      try {
        await registrar(datosValidos);
      } catch { /* ignorar */ }

      expect(mockBcryptHash).not.toHaveBeenCalled();
      expect(mockCrearUsuario).not.toHaveBeenCalled();
      expect(mockCrearDispositivo).not.toHaveBeenCalled();
    });

    it('no debe cifrar ni insertar si hay duplicado de correo', async () => {
      mockBuscarPorCorreo.mockResolvedValue(usuarioMock);

      try {
        await registrar(datosValidos);
      } catch { /* ignorar */ }

      expect(mockBcryptHash).not.toHaveBeenCalled();
      expect(mockCrearUsuario).not.toHaveBeenCalled();
      expect(mockCrearDispositivo).not.toHaveBeenCalled();
    });
  });
});


// Mock del servicio de sesión
jest.mock('./sesion.servicio');
import { sesionServicio } from './sesion.servicio';
import { login } from './autenticacion.servicio';

const mockCrearSesion = sesionServicio.crearSesion as jest.MockedFunction<typeof sesionServicio.crearSesion>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('Servicio de autenticación — login', () => {
  const usuarioActivo: Usuario = {
    id: 1,
    alias: 'juanperez',
    correo: 'juan@correo.com',
    contrasena: '$2b$10$hashalmacenado',
    estatus: 1,
    creado_en: new Date('2024-01-01'),
  };

  const usuarioInactivo: Usuario = {
    id: 2,
    alias: 'inactivo',
    correo: 'inactivo@correo.com',
    contrasena: '$2b$10$hashalmacenado',
    estatus: 0,
    creado_en: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login exitoso', () => {
    it('debe retornar el sessionId cuando las credenciales son correctas', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockCrearSesion.mockResolvedValue('uuid-sesion-generado');

      const resultado = await login('juanperez', 'MiContrasena123');

      expect(resultado).toBe('uuid-sesion-generado');
    });

    it('debe buscar al usuario por alias', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockCrearSesion.mockResolvedValue('uuid-sesion');

      await login('juanperez', 'MiContrasena123');

      expect(mockBuscarPorAlias).toHaveBeenCalledWith('juanperez');
    });

    it('debe comparar la contraseña con bcrypt', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockCrearSesion.mockResolvedValue('uuid-sesion');

      await login('juanperez', 'MiContrasena123');

      expect(mockBcryptCompare).toHaveBeenCalledWith('MiContrasena123', '$2b$10$hashalmacenado');
    });

    it('debe crear la sesión con el id y alias del usuario', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockCrearSesion.mockResolvedValue('uuid-sesion');

      await login('juanperez', 'MiContrasena123');

      expect(mockCrearSesion).toHaveBeenCalledWith(1, 'juanperez');
    });
  });

  describe('Alias no encontrado', () => {
    it('debe lanzar ErrorHttp 401 si el alias no existe', async () => {
      mockBuscarPorAlias.mockResolvedValue(null);

      await expect(login('inexistente', 'password'))
        .rejects.toMatchObject({ codigo: 401 });
    });

    it('debe usar un mensaje genérico que no revele que el alias no existe', async () => {
      mockBuscarPorAlias.mockResolvedValue(null);

      await expect(login('inexistente', 'password'))
        .rejects.toMatchObject({ mensaje: 'Credenciales inválidas' });
    });

    it('no debe comparar contraseña ni crear sesión si el alias no existe', async () => {
      mockBuscarPorAlias.mockResolvedValue(null);

      try { await login('inexistente', 'password'); } catch { /* ignorar */ }

      expect(mockBcryptCompare).not.toHaveBeenCalled();
      expect(mockCrearSesion).not.toHaveBeenCalled();
    });
  });

  describe('Usuario con estatus 0 (inactivo)', () => {
    it('debe lanzar ErrorHttp 401 si el estatus es 0', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioInactivo);

      await expect(login('inactivo', 'password'))
        .rejects.toMatchObject({ codigo: 401 });
    });

    it('debe usar el mismo mensaje genérico que alias inexistente', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioInactivo);

      await expect(login('inactivo', 'password'))
        .rejects.toMatchObject({ mensaje: 'Credenciales inválidas' });
    });

    it('no debe comparar contraseña ni crear sesión si estatus es 0', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioInactivo);

      try { await login('inactivo', 'password'); } catch { /* ignorar */ }

      expect(mockBcryptCompare).not.toHaveBeenCalled();
      expect(mockCrearSesion).not.toHaveBeenCalled();
    });
  });

  describe('Contraseña incorrecta', () => {
    it('debe lanzar ErrorHttp 401 si la contraseña no coincide', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);

      await expect(login('juanperez', 'contrasenaIncorrecta'))
        .rejects.toMatchObject({ codigo: 401 });
    });

    it('debe usar el mismo mensaje genérico que alias inexistente y estatus 0', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);

      await expect(login('juanperez', 'contrasenaIncorrecta'))
        .rejects.toMatchObject({ mensaje: 'Credenciales inválidas' });
    });

    it('no debe crear sesión si la contraseña es incorrecta', async () => {
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);

      try { await login('juanperez', 'contrasenaIncorrecta'); } catch { /* ignorar */ }

      expect(mockCrearSesion).not.toHaveBeenCalled();
    });
  });

  describe('Anti-filtración de información (Req 2.2, 2.4)', () => {
    it('debe usar mensaje de error idéntico para alias inexistente, estatus 0 y contraseña incorrecta', async () => {
      // Caso 1: alias inexistente
      mockBuscarPorAlias.mockResolvedValue(null);
      let errorAlias: ErrorHttp | undefined;
      try { await login('noexiste', 'pwd'); } catch (e) { errorAlias = e as ErrorHttp; }

      // Caso 2: estatus 0
      mockBuscarPorAlias.mockResolvedValue(usuarioInactivo);
      let errorEstatus: ErrorHttp | undefined;
      try { await login('inactivo', 'pwd'); } catch (e) { errorEstatus = e as ErrorHttp; }

      // Caso 3: contraseña incorrecta
      mockBuscarPorAlias.mockResolvedValue(usuarioActivo);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);
      let errorContrasena: ErrorHttp | undefined;
      try { await login('juanperez', 'mala'); } catch (e) { errorContrasena = e as ErrorHttp; }

      // Los tres mensajes deben ser exactamente iguales
      expect(errorAlias!.mensaje).toBe(errorEstatus!.mensaje);
      expect(errorEstatus!.mensaje).toBe(errorContrasena!.mensaje);
      expect(errorAlias!.codigo).toBe(errorEstatus!.codigo);
      expect(errorEstatus!.codigo).toBe(errorContrasena!.codigo);
    });
  });
});


// --- Tests de recuperación de contraseña ---

jest.mock('../repositorios/redis.repositorio');
jest.mock('./correo.servicio');
jest.mock('uuid');

import { redisRepositorio } from '../repositorios/redis.repositorio';
import { enviarCorreoRecuperacion } from './correo.servicio';
import { v4 as uuidv4 } from 'uuid';
import { solicitarRecuperacion, cambiarContrasena } from './autenticacion.servicio';

const mockGuardarLlaveRecuperacion = redisRepositorio.guardarLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.guardarLlaveRecuperacion>;
const mockObtenerLlaveRecuperacion = redisRepositorio.obtenerLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.obtenerLlaveRecuperacion>;
const mockEliminarLlaveRecuperacion = redisRepositorio.eliminarLlaveRecuperacion as jest.MockedFunction<typeof redisRepositorio.eliminarLlaveRecuperacion>;
const mockEnviarCorreoRecuperacion = enviarCorreoRecuperacion as jest.MockedFunction<typeof enviarCorreoRecuperacion>;
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;
const mockActualizarContrasena = usuarioRepo.actualizarContrasena as jest.MockedFunction<typeof usuarioRepo.actualizarContrasena>;

describe('Servicio de autenticación — solicitarRecuperacion', () => {
  const usuarioExistente: Usuario = {
    id: 1,
    alias: 'juanperez',
    correo: 'juan@correo.com',
    contrasena: '$2b$10$hashalmacenado',
    estatus: 1,
    creado_en: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUuidv4 as jest.Mock).mockReturnValue('uuid-llave-generada');
    mockGuardarLlaveRecuperacion.mockResolvedValue(undefined);
    mockEliminarLlaveRecuperacion.mockResolvedValue(undefined);
    mockEnviarCorreoRecuperacion.mockResolvedValue(undefined);
  });

  it('debe retornar sin error cuando el correo no existe (anti-enumeración)', async () => {
    mockBuscarPorCorreo.mockResolvedValue(null);

    await expect(solicitarRecuperacion('noexiste@correo.com')).resolves.toBeUndefined();
  });

  it('no debe generar llave ni enviar correo si el usuario no existe', async () => {
    mockBuscarPorCorreo.mockResolvedValue(null);

    await solicitarRecuperacion('noexiste@correo.com');

    expect(mockGuardarLlaveRecuperacion).not.toHaveBeenCalled();
    expect(mockEnviarCorreoRecuperacion).not.toHaveBeenCalled();
  });

  it('debe generar una llave UUID y guardarla en Redis con TTL 180s cuando el correo existe', async () => {
    mockBuscarPorCorreo.mockResolvedValue(usuarioExistente);

    await solicitarRecuperacion('juan@correo.com');

    expect(mockGuardarLlaveRecuperacion).toHaveBeenCalledWith('uuid-llave-generada', 1, 180);
  });

  it('debe enviar correo de recuperación con el correo y la llave generada', async () => {
    mockBuscarPorCorreo.mockResolvedValue(usuarioExistente);

    await solicitarRecuperacion('juan@correo.com');

    expect(mockEnviarCorreoRecuperacion).toHaveBeenCalledWith('juan@correo.com', 'uuid-llave-generada');
  });

  it('debe eliminar la llave de Redis y lanzar ErrorHttp(500) si el envío de correo falla', async () => {
    mockBuscarPorCorreo.mockResolvedValue(usuarioExistente);
    mockEnviarCorreoRecuperacion.mockRejectedValue(new Error('SMTP error'));

    await expect(solicitarRecuperacion('juan@correo.com'))
      .rejects.toMatchObject({ codigo: 500, mensaje: 'Error al enviar correo de recuperación' });

    expect(mockEliminarLlaveRecuperacion).toHaveBeenCalledWith('uuid-llave-generada');
  });

  it('debe seguir el orden: buscar → guardar llave → enviar correo', async () => {
    const callOrder: string[] = [];
    mockBuscarPorCorreo.mockImplementation(async () => { callOrder.push('buscarCorreo'); return usuarioExistente; });
    mockGuardarLlaveRecuperacion.mockImplementation(async () => { callOrder.push('guardarLlave'); });
    mockEnviarCorreoRecuperacion.mockImplementation(async () => { callOrder.push('enviarCorreo'); });

    await solicitarRecuperacion('juan@correo.com');

    expect(callOrder).toEqual(['buscarCorreo', 'guardarLlave', 'enviarCorreo']);
  });
});

describe('Servicio de autenticación — cambiarContrasena', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerLlaveRecuperacion.mockResolvedValue({ idUsuario: 1 });
    (mockBcryptHash as jest.Mock).mockResolvedValue('$2b$10$nuevohash');
    mockActualizarContrasena.mockResolvedValue(undefined);
    mockEliminarLlaveRecuperacion.mockResolvedValue(undefined);
  });

  it('debe lanzar ErrorHttp(400) si la llave no existe en Redis', async () => {
    mockObtenerLlaveRecuperacion.mockResolvedValue(null);

    await expect(cambiarContrasena('llave-invalida', 'NuevaPass123'))
      .rejects.toMatchObject({ codigo: 400, mensaje: 'Enlace inválido o expirado' });
  });

  it('no debe cifrar ni actualizar contraseña si la llave es inválida', async () => {
    mockObtenerLlaveRecuperacion.mockResolvedValue(null);

    try { await cambiarContrasena('llave-invalida', 'NuevaPass123'); } catch { /* ignorar */ }

    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockActualizarContrasena).not.toHaveBeenCalled();
  });

  it('debe cifrar la nueva contraseña con bcrypt usando 10 salt rounds', async () => {
    await cambiarContrasena('llave-valida', 'NuevaPass123');

    expect(mockBcryptHash).toHaveBeenCalledWith('NuevaPass123', 10);
  });

  it('debe actualizar la contraseña del usuario correcto en la BD', async () => {
    await cambiarContrasena('llave-valida', 'NuevaPass123');

    expect(mockActualizarContrasena).toHaveBeenCalledWith(1, '$2b$10$nuevohash');
  });

  it('debe eliminar la llave de Redis después de actualizar la contraseña', async () => {
    await cambiarContrasena('llave-valida', 'NuevaPass123');

    expect(mockEliminarLlaveRecuperacion).toHaveBeenCalledWith('llave-valida');
  });

  it('debe seguir el orden: verificar llave → cifrar → actualizar BD → eliminar llave', async () => {
    const callOrder: string[] = [];
    mockObtenerLlaveRecuperacion.mockImplementation(async () => { callOrder.push('obtenerLlave'); return { idUsuario: 1 }; });
    (mockBcryptHash as jest.Mock).mockImplementation(async () => { callOrder.push('bcryptHash'); return '$2b$10$hash'; });
    mockActualizarContrasena.mockImplementation(async () => { callOrder.push('actualizarContrasena'); });
    mockEliminarLlaveRecuperacion.mockImplementation(async () => { callOrder.push('eliminarLlave'); });

    await cambiarContrasena('llave-valida', 'NuevaPass123');

    expect(callOrder).toEqual(['obtenerLlave', 'bcryptHash', 'actualizarContrasena', 'eliminarLlave']);
  });
});
