import express, { Application } from 'express';
import request from 'supertest';
import { configurarSeguridad } from './seguridad.middleware';

describe('seguridad.middleware - configurarSeguridad', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    configurarSeguridad(app);

    // Ruta de prueba que devuelve el body parseado y las cookies
    app.post('/test', (req, res) => {
      res.json({ body: req.body, cookies: req.cookies });
    });
  });

  it('debe permitir solicitudes desde http://localhost:4200 con CORS', async () => {
    const respuesta = await request(app)
      .options('/test')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST');

    expect(respuesta.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    expect(respuesta.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no debe incluir el origen no permitido en Access-Control-Allow-Origin', async () => {
    const respuesta = await request(app)
      .options('/test')
      .set('Origin', 'http://localhost:9999')
      .set('Access-Control-Request-Method', 'POST');

    // Cuando el origen no coincide, cors no establece el header con el origen solicitante
    const allowOrigin = respuesta.headers['access-control-allow-origin'];
    expect(allowOrigin).not.toBe('http://localhost:9999');
  });

  it('debe parsear cookies httpOnly correctamente', async () => {
    const respuesta = await request(app)
      .post('/test')
      .set('Cookie', 'sesionId=abc123')
      .send({});

    expect(respuesta.body.cookies).toHaveProperty('sesionId', 'abc123');
  });

  it('debe parsear cuerpo JSON application/json', async () => {
    const datos = { alias: 'usuario1', contrasena: 'clave123' };

    const respuesta = await request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send(datos);

    expect(respuesta.body.body).toEqual(datos);
  });
});
