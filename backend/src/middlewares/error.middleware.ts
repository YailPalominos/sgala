import { Request, Response, NextFunction } from 'express';
import { ErrorHttp } from '../utilidades/error-http';

export function manejadorErrores(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ErrorHttp) {
    res.status(err.codigo).json({ error: err.mensaje });
    return;
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
