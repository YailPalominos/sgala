import { Request, Response, NextFunction } from 'express';
import { manejadorErrores } from './error.middleware';
import { ErrorHttp } from '../utilidades/error-http';

function crearMockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('manejadorErrores', () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe responder con el código y mensaje de ErrorHttp', () => {
    const res = crearMockRes() as Response;
    const error = new ErrorHttp(404, 'Recurso no encontrado');

    manejadorErrores(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Recurso no encontrado' });
  });

  it('debe responder 400 para errores de validación', () => {
    const res = crearMockRes() as Response;
    const error = new ErrorHttp(400, 'Campos requeridos faltantes');

    manejadorErrores(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Campos requeridos faltantes' });
  });

  it('debe responder 500 con mensaje genérico para errores no controlados', () => {
    const res = crearMockRes() as Response;
    const error = new Error('algo inesperado');

    manejadorErrores(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });

  it('debe loguear el error completo para errores no controlados', () => {
    const res = crearMockRes() as Response;
    const error = new Error('error interno');

    manejadorErrores(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error no controlado:', error);
  });

  it('no debe loguear errores controlados de ErrorHttp', () => {
    const res = crearMockRes() as Response;
    const error = new ErrorHttp(409, 'Conflicto');

    manejadorErrores(error, req, res, next);

    expect(console.error).not.toHaveBeenCalled();
  });
});
