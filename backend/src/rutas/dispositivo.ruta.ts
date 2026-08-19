import { Router } from 'express';
import { middlewareSesion } from '../interceptores/sesion.middleware';
import { actualizar, crear, obtenerLocalizaciones, obtenerListaDispositivosUsuario, buscarPorClave } from '../repositorios/base-datos/dispositivo.repositorio';
import asyncHandler from 'express-async-handler';
import { enviarDispositivoActualizado } from '../socket'
import { actualizarDatosDispositivo } from '@/repositorios/redis/dispositivo.redis';
import { ErrorHttp } from '@/interceptores/error.middleware';
export const dispositivoRouter = Router();

/**
 * Verifica que la clave del pre dispositivo exista y no esté siendo usada.
 */
dispositivoRouter.get('/validar-clave/:clave',
  asyncHandler(async (solicitud, respuesta) => {
    const { clave } = solicitud.params;
    let datosDispositivo;
    try {
      datosDispositivo = await buscarPorClave(clave, solicitud.sesion.idUsuario);
    } catch (error: any) {
      throw new ErrorHttp(
        404,
        error.message
      );
    }
    respuesta.status(200).json({
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
    actualizarDatosDispositivo(datos.clave, datos)
    await enviarDispositivoActualizado(datos.clave)
    respuesta.status(200).json({ mensaje: 'Dispositivo actualizado exitosamente.' });
  })
);


/**
 * Obtener lista de dispositivos del usuario
 */
dispositivoRouter.get('/obtener-lista-dipositivos-usuario',
  asyncHandler(async (solicitud, respuesta) => {

    const idUsuario = solicitud.sesion.idUsuario;

    const datos = await obtenerListaDispositivosUsuario(idUsuario);

    respuesta.status(200).json({
      mensaje: 'Localizaciones obtenidas exitosamente.',
      datos
    });
  })
);

/**
 * Obtener lista de localizaciones 
 */
dispositivoRouter.get('/obtener-lista',
  asyncHandler(async (solicitud, respuesta) => {

    const filtros = solicitud.query
    const idUsuario = solicitud.sesion.idUsuario;

    const datos = await obtenerLocalizaciones(idUsuario, filtros);

    respuesta.status(200).json({
      mensaje: 'Localizaciones obtenidas exitosamente.',
      datos
    });
  })
);