import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from "uuid";

export class ErrorHttp extends Error {
  constructor(
    public readonly codigo: number = 400,
    public readonly mensaje: string = 'Error'
  ) {
    super(mensaje);
    this.name = 'ErrorHttp';
    Object.setPrototypeOf(this, ErrorHttp.prototype);
  }
}

export function manejadorErrores(
  error: unknown,
  _: Request,
  respuesta: Response,
  __: NextFunction
): void {

  if (error instanceof ErrorHttp) {
    console.log(error)
    respuesta.status(error.codigo).json({
      mensaje: error.mensaje
    });
    return;
  }

  const referencia = uuid();

  console.error(
    `[${referencia}]`,
    error
  );

  respuesta.status(500).json({
    mensaje: `Error interno del servidor:[${referencia}]`
  });
}