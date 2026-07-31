import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { crear } from '../repositorios/solicitud.repositorio'

export const solicitudRouter = Router();

/**
 * Crea una solicitud
 */
solicitudRouter.post('/crear',
  asyncHandler(async (solicitud, respuesta) => {

    const datos = solicitud.body;
    await crear(datos)

    respuesta.status(200).json({
      mensaje: 'Solicitud creada exitosamente.',
    });
  })
);