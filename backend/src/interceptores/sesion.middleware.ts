import { Request, Response, NextFunction, RequestHandler } from 'express';
import { unless } from 'express-unless';

import { sesionServicio } from '../servicios/sesion.servicio';
import { SesionRedis } from '@/repositorios/redis.repositorio';


declare global {
  namespace Express {
    interface Request {
      sesion: SesionRedis;
    }
  }
}


interface MiddlewareSesion extends RequestHandler {
  unless: typeof unless;
}

export const middlewareSesion = (async (
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction
): Promise<void> => {

  const claveSesion = solicitud.header('clave-sesion');

  if (!claveSesion) {
    respuesta.status(400).json({
      mensaje: 'No se proporcionó la clave de sesión.'
    });
    return;
  }

  try {

    solicitud.sesion = await sesionServicio.obtenerSesion(claveSesion);

    siguiente();

  } catch (error) {
    respuesta.status(401).json({
      mensaje: error instanceof Error
        ? error.message
        : 'Error desconocido'
    });
  }

}) as unknown as MiddlewareSesion;


middlewareSesion.unless = unless;
