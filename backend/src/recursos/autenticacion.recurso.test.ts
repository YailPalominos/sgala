import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { autenticacionRouter } from './autenticacion.recurso';
import { manejadorErrores } from '../middlewares/error.middleware';
import * as autenticacionServicio from '../servicios/autenticacion.servicio';
import { sesionServicio } from '../servicios/sesion.servicio';
import { ErrorHttp } from '../utilidades/error-http';

jest.mock('../configuracion/base-datos', () => ({
  pool: {},
  conexionPool: Promise.resolve(),
}));
jest.mock('../configuracion/redis', () => ({
  redis: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));
jest.mock('../servicios/autenticacion.servicio');
jest.mock('../servicios/sesion.servicio');

const mockedRegistrar = autenticacionServicio.registrar as jest.MockedFunction<typeof autenticacionServicio.registrar>;
const mockedLogin = autenticacionServicio.login as jest.MockedFunction<typeof autenticacionServicio.login>;
const mockedSolicitarRecuperacion = autenticacionServicio.solicitarRecuperacion as jest.MockedFunction<typeof autenticacionServicio.solicitarRecuperacion>;
const mockedCambiarContrasena = autenticacionServicio.cambiarContrasena as jest.MockedFunction<typeof autenticacionServicio.cambiarContrasena>;

const mockedSesionServicio = sesionServicio as jest.Mocked<typeof sesionServicio>;

function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', autenticacionRouter);
  app.use(manejadorErrores);
  return app;
}

describe('POST /api/auth/registro', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  const datosValidos = {
    uuidPreDispositivo: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    alias: 'usuario1',
    correo: 'usuario@correo.com',
    contrasena: 'MiContrasena123',
    telefono: '+521234567890',
  };

  it('debe responder 201 cuando el registro es exitoso', async () => {
    mockedRegistrar.mockResolvedValue({
      usuario: { id: 1, alias: 'usuario1', correo: 'usuario@correo.com', contrasena: 'hash', estatus: 1 },
      dispositivo: { id: 1, uuid: 'uuid-disp', id_usuario: 1, id_pre_dispositivo: 1, telefono: '+521234567890' },
    } as any);

    const res = await request(app)
      .post('/api/auth/registro')
      .send(datosValidos);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ mensaje: 'Usuario registrado exitosamente' });
    expect(mockedRegistrar).toHaveBeenCalledWith(datosValidos);
  });

  it('debe responder 400 cuando faltan todos los campos', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Campos requeridos faltantes');
    expect(res.body.error).toContain('uuidPreDispositivo');
    expect(res.body.error).toContain('alias');
    expect(res.body.error).toContain('correo');
    expect(res.body.error).toContain('contrasena');
    expect(res.body.error).toContain('telefono');
    expect(mockedRegistrar).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando falta uuidPreDispositivo', async () => {
    const { uuidPreDispositivo, ...sinUuid } = datosValidos;

    const res = await request(app)
      .post('/api/auth/registro')
      .send(sinUuid);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('uuidPreDispositivo');
    expect(mockedRegistrar).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando falta alias', async () => {
    const { alias, ...sinAlias } = datosValidos;

    const res = await request(app)
      .post('/api/auth/registro')
      .send(sinAlias);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('alias');
    expect(mockedRegistrar).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando falta telefono', async () => {
    const { telefono, ...sinTelefono } = datosValidos;

    const res = await request(app)
      .post('/api/auth/registro')
      .send(sinTelefono);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('telefono');
    expect(mockedRegistrar).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando un campo es cadena vacía', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...datosValidos, alias: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('alias');
    expect(mockedRegistrar).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando el servicio lanza ErrorHttp 400 (pre-dispositivo inválido)', async () => {
    mockedRegistrar.mockRejectedValue(new ErrorHttp(400, 'El UUID de pre-dispositivo no existe'));

    const res = await request(app)
      .post('/api/auth/registro')
      .send(datosValidos);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El UUID de pre-dispositivo no existe');
  });

  it('debe responder 409 cuando el servicio lanza ErrorHttp 409 (alias duplicado)', async () => {
    mockedRegistrar.mockRejectedValue(new ErrorHttp(409, 'El alias ya está registrado'));

    const res = await request(app)
      .post('/api/auth/registro')
      .send(datosValidos);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('El alias ya está registrado');
  });

  it('debe responder 500 cuando ocurre un error inesperado', async () => {
    mockedRegistrar.mockRejectedValue(new Error('Error de conexión'));

    const res = await request(app)
      .post('/api/auth/registro')
      .send(datosValidos);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});


describe('POST /api/auth/login', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  const credencialesValidas = {
    alias: 'usuario1',
    contrasena: 'MiContrasena123',
  };

  it('debe responder 200 y establecer cookie httpOnly con sessionId', async () => {
    mockedLogin.mockResolvedValue('session-uuid-12345');

    const res = await request(app)
      .post('/api/auth/login')
      .send(credencialesValidas);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Inicio de sesión exitoso' });
    expect(mockedLogin).toHaveBeenCalledWith('usuario1', 'MiContrasena123');

    // Verificar que se establece la cookie con los flags correctos
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieStr).toContain('sessionId=session-uuid-12345');
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr).toContain('SameSite=Strict');
    expect(cookieStr).toContain('Max-Age=86400');
  });

  it('debe establecer cookie sin flag Secure cuando NODE_ENV no es production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockedLogin.mockResolvedValue('session-uuid-dev');

    const res = await request(app)
      .post('/api/auth/login')
      .send(credencialesValidas);

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieStr).not.toContain('Secure');

    process.env.NODE_ENV = originalEnv;
  });

  it('debe establecer cookie con flag Secure cuando NODE_ENV es production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    mockedLogin.mockResolvedValue('session-uuid-prod');

    const res = await request(app)
      .post('/api/auth/login')
      .send(credencialesValidas);

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieStr).toContain('Secure');

    process.env.NODE_ENV = originalEnv;
  });

  it('debe responder 401 cuando las credenciales son inválidas', async () => {
    mockedLogin.mockRejectedValue(new ErrorHttp(401, 'Credenciales inválidas'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ alias: 'noexiste', contrasena: 'mala' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('debe responder 500 cuando ocurre un error inesperado', async () => {
    mockedLogin.mockRejectedValue(new Error('Error de conexión'));

    const res = await request(app)
      .post('/api/auth/login')
      .send(credencialesValidas);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});

describe('POST /api/auth/logout', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  it('debe responder 200 y eliminar sesión de Redis e invalidar cookie cuando la sesión es válida', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedSesionServicio.eliminarSesion.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'sessionId=valid-session-id');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Sesión cerrada exitosamente' });

    // Verificar que se eliminó la sesión de Redis
    expect(mockedSesionServicio.eliminarSesion).toHaveBeenCalledWith('valid-session-id');

    // Verificar que se invalidó la cookie con los flags de seguridad
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    expect(cookieStr).toContain('sessionId=');
    expect(cookieStr).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr).toContain('SameSite=Strict');
  });

  it('debe responder 401 cuando no hay cookie de sesión', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedSesionServicio.eliminarSesion).not.toHaveBeenCalled();
  });

  it('debe responder 401 cuando la sesión no existe en Redis', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'sessionId=invalid-session-id');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedSesionServicio.eliminarSesion).not.toHaveBeenCalled();
  });

  it('debe responder 500 cuando eliminarSesion lanza un error inesperado', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedSesionServicio.eliminarSesion.mockRejectedValue(new Error('Redis no disponible'));

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'sessionId=valid-session-id');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});


describe('POST /api/auth/recuperacion/solicitar', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  it('debe responder 200 cuando el correo existe (anti-enumeración)', async () => {
    mockedSolicitarRecuperacion.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/recuperacion/solicitar')
      .send({ correo: 'usuario@correo.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
    expect(mockedSolicitarRecuperacion).toHaveBeenCalledWith('usuario@correo.com');
  });

  it('debe responder 200 cuando el correo NO existe (anti-enumeración)', async () => {
    mockedSolicitarRecuperacion.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/recuperacion/solicitar')
      .send({ correo: 'noexiste@correo.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
    expect(mockedSolicitarRecuperacion).toHaveBeenCalledWith('noexiste@correo.com');
  });

  it('debe propagar ErrorHttp 500 cuando falla el envío del correo', async () => {
    mockedSolicitarRecuperacion.mockRejectedValue(new ErrorHttp(500, 'Error al enviar correo de recuperación'));

    const res = await request(app)
      .post('/api/auth/recuperacion/solicitar')
      .send({ correo: 'usuario@correo.com' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error al enviar correo de recuperación');
  });

  it('debe responder 500 cuando ocurre un error inesperado', async () => {
    mockedSolicitarRecuperacion.mockRejectedValue(new Error('Redis no disponible'));

    const res = await request(app)
      .post('/api/auth/recuperacion/solicitar')
      .send({ correo: 'usuario@correo.com' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});

describe('POST /api/auth/recuperacion/cambiar', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  it('debe responder 200 cuando la llave es válida y la contraseña se actualiza', async () => {
    mockedCambiarContrasena.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/recuperacion/cambiar')
      .send({ llave: 'llave-uuid-valida', nuevaContrasena: 'NuevaContrasena123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Contraseña actualizada exitosamente' });
    expect(mockedCambiarContrasena).toHaveBeenCalledWith('llave-uuid-valida', 'NuevaContrasena123');
  });

  it('debe responder 400 cuando la llave es inválida o expirada', async () => {
    mockedCambiarContrasena.mockRejectedValue(new ErrorHttp(400, 'Enlace inválido o expirado'));

    const res = await request(app)
      .post('/api/auth/recuperacion/cambiar')
      .send({ llave: 'llave-expirada', nuevaContrasena: 'NuevaContrasena123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Enlace inválido o expirado');
  });

  it('debe responder 500 cuando ocurre un error inesperado', async () => {
    mockedCambiarContrasena.mockRejectedValue(new Error('Error de conexión'));

    const res = await request(app)
      .post('/api/auth/recuperacion/cambiar')
      .send({ llave: 'llave-uuid', nuevaContrasena: 'NuevaContrasena123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});
