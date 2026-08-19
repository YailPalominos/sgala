import { Router } from 'express';
import { redisRepositorio } from '../repositorios/redis.repositorio';
export const datosRoute = Router();
import asyncHandler from 'express-async-handler';

/**
 * Solicita al servidor los precios
 */
datosRoute.get('/obtener-precios',
  asyncHandler(async (_, respuesta) => {
    const precios = await redisRepositorio.obtenerPrecios();
    respuesta.status(200).json({
      datos: precios,
      mensaje: 'Precios obtenidos exitosamente.'
    });
  })
);
