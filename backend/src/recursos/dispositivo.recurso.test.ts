import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { dispositivoRouter } from './dispositivo.recurso';
import { manejadorErrores } from '../middlewares/error.middleware';
import * as dispositivoServicio from '../servicios/dispositivo.servicio';
import { sesionServicio } from '../servicios/sesion.servicio';
import { ErrorHttp } from '../utilidades/error-http';

jest.mock('../configuracion/base-datos', () => ({
  pool: {},
  conexionPool: Promise.resolve(),
}));
jest.mock('../configuracion/redis', () => ({
  redis: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));
jest.mock('../servicios/dispositivo.servicio');
jest.mock('../servicios/sesion.servicio');

const mockedListar = dispositivoServicio.listarDispositivosPorUsuario as jest.MockedFunction<typeof dispositivoServicio.listarDispositivosPorUsuario>;
const mockedObtenerEnlace = dispositivoServicio.obtenerEnlaceMapa as jest.MockedFunction<typeof dispositivoServicio.obtenerEnlaceMapa>;
const mockedSesionServicio = sesionServicio as jest.Mocked<typeof sesionServicio>;

function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/dispositivos', dispositivoRouter);
  app.use(manejadorErrores);
  return app;
}

describe('GET /api/dispositivos', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  it('debe responder 200 con la lista de dispositivos del usuario autenticado', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedListar.mockResolvedValue([
      { id: 10, telefono: '+521234567890', localizacion: { latitud: 19.4326, longitud: -99.1332, altitud: 2240 } },
      { id: 11, telefono: '+529876543210', localizacion: null },
    ]);

    const res = await request(app)
      .get('/api/dispositivos')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 10, telefono: '+521234567890', localizacion: { latitud: 19.4326, longitud: -99.1332, altitud: 2240 } },
      { id: 11, telefono: '+529876543210', localizacion: null },
    ]);
    expect(mockedListar).toHaveBeenCalledWith(1);
  });

  it('debe responder 200 con arreglo vacío si el usuario no tiene dispositivos', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 2, alias: 'usuario2' });
    mockedListar.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/dispositivos')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockedListar).toHaveBeenCalledWith(2);
  });

  it('debe responder 401 cuando no hay cookie de sesión', async () => {
    const res = await request(app)
      .get('/api/dispositivos');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedListar).not.toHaveBeenCalled();
  });

  it('debe responder 401 cuando la sesión es inválida', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/dispositivos')
      .set('Cookie', 'sessionId=invalid-session');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedListar).not.toHaveBeenCalled();
  });

  it('debe responder 500 cuando ocurre un error inesperado en el servicio', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedListar.mockRejectedValue(new Error('Error de conexión'));

    const res = await request(app)
      .get('/api/dispositivos')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});

describe('GET /api/dispositivos/:id/mapa', () => {
  let app: express.Application;

  beforeEach(() => {
    app = crearApp();
    jest.clearAllMocks();
  });

  it('debe responder 200 con la URL de Google Maps cuando hay localización disponible', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedObtenerEnlace.mockResolvedValue({ url: 'https://www.google.com/maps?q=19.4326,-99.1332' });

    const res = await request(app)
      .get('/api/dispositivos/10/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: 'https://www.google.com/maps?q=19.4326,-99.1332' });
    expect(mockedObtenerEnlace).toHaveBeenCalledWith(10, 1);
  });

  it('debe responder 404 cuando el dispositivo no tiene localización', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedObtenerEnlace.mockRejectedValue(new ErrorHttp(404, 'No hay localización disponible para el dispositivo'));

    const res = await request(app)
      .get('/api/dispositivos/10/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No hay localización disponible para el dispositivo');
  });

  it('debe responder 403 cuando el dispositivo no pertenece al usuario', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedObtenerEnlace.mockRejectedValue(new ErrorHttp(403, 'No tienes acceso a este dispositivo'));

    const res = await request(app)
      .get('/api/dispositivos/99/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('No tienes acceso a este dispositivo');
  });

  it('debe responder 404 cuando el dispositivo no existe', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedObtenerEnlace.mockRejectedValue(new ErrorHttp(404, 'Dispositivo no encontrado'));

    const res = await request(app)
      .get('/api/dispositivos/999/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Dispositivo no encontrado');
  });

  it('debe responder 400 cuando el ID no es un número válido', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });

    const res = await request(app)
      .get('/api/dispositivos/abc/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ID de dispositivo inválido');
    expect(mockedObtenerEnlace).not.toHaveBeenCalled();
  });

  it('debe responder 401 cuando no hay cookie de sesión', async () => {
    const res = await request(app)
      .get('/api/dispositivos/10/mapa');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedObtenerEnlace).not.toHaveBeenCalled();
  });

  it('debe responder 401 cuando la sesión es inválida', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/dispositivos/10/mapa')
      .set('Cookie', 'sessionId=invalid-session');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'No autorizado' });
    expect(mockedObtenerEnlace).not.toHaveBeenCalled();
  });

  it('debe responder 500 cuando ocurre un error inesperado', async () => {
    mockedSesionServicio.verificarSesion.mockResolvedValue({ idUsuario: 1, alias: 'usuario1' });
    mockedObtenerEnlace.mockRejectedValue(new Error('Redis no disponible'));

    const res = await request(app)
      .get('/api/dispositivos/10/mapa')
      .set('Cookie', 'sessionId=valid-session');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});
