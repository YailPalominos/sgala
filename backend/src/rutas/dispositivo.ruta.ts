import { Router } from 'express';
import { middlewareSesion } from '../interceptores/sesion.middleware';
import { actualizar, crear, obtenerLocalizaciones } from '../repositorios/dispositivo.repositorio';
import { validarClave } from '../servicios/dispositivo.servicio'
import { redisRepositorio } from '../repositorios/redis.repositorio';
import asyncHandler from 'express-async-handler';
import { enviarDispositivoActualizado } from '../socketio/servidor.socketio'
export const dispositivoRouter = Router();

/**
 * Verifica que la clave del pre dispositivo exista y no esté siendo usada.
 */
dispositivoRouter.get('/validar-clave/:clave',
  asyncHandler(async (solicitud, respuesta) => {
    const { clave } = solicitud.params;
    const datosDispositivo = await validarClave(clave, solicitud.sesion.idUsuario);
    respuesta.status(202).json({
      mensaje: 'Se valido la clave del dispostivo exitosamente.',
      datos: datosDispositivo
    });
  })
);

/**
 * Actualiza los datos de un dispositivo del usuario autenticado.
 */
dispositivoRouter.post('/crear', middlewareSesion,
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body
    datos.idUsuario = solicitud.sesion.idUsuario;
    await crear(datos);
    await enviarDispositivoActualizado(datos.claveDispositivo)
    respuesta.status(200).json({ mensaje: 'Dispositivo creado exitosamente.' });
  })
);

/**
 * Actualiza los datos de un dispositivo del usuario autenticado.
 */
dispositivoRouter.put('/actualizar',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body
    await actualizar(datos);
    redisRepositorio.actualizarDatos(datos)
    await enviarDispositivoActualizado(datos.clave)
    respuesta.status(200).json({ mensaje: 'Dispositivo actualizado exitosamente.' });
  })
);

/**
 * Verifica que la clave del pre dispositivo exista y no esté siendo usada.
 */
dispositivoRouter.get('/obtener-localizaciones/:clave',
  asyncHandler(async (solicitud, respuesta) => {
    const { clave } = solicitud.params;
    const localizaciones = await obtenerLocalizaciones(clave);
    respuesta.status(202).json({
      mensaje: 'Se valido la clave del dispostivo exitosamente.',
      datos: localizaciones
    });
  })
);