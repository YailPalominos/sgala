import { Router } from 'express';
import { actualizar, crear, obtenerLocalizaciones, obtenerHistorialLocalizaciones, obtenerListaDispositivosUsuario, buscarPorClave, crearPreDispositivo } from '../repositorios/base-datos/dispositivo.repositorio';
import asyncHandler from 'express-async-handler';
import { enviarDispositivoActualizado } from '../socket'
import { actualizarDatosDispositivo } from '@/repositorios/redis/dispositivo.redis';
import { ErrorHttp } from '@/interceptores/error.middleware';
import { crearCertificadoCelular } from '@/servicios/certificados.servicio';
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
dispositivoRouter.post('/crear',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body
    datos.idUsuario = solicitud.sesion.idUsuario;
    await crear(datos)
    await enviarDispositivoActualizado(datos.claveDispositivo)
    respuesta.status(201).json({ mensaje: 'Dispositivo creado exitosamente.' });
  })
);

/**
 * Actualiza los datos de un dispositivo del usuario autenticado.
 */
dispositivoRouter.put('/actualizar',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body
    await actualizar(datos);
    await actualizarDatosDispositivo(datos.clave, datos)
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

/** Obtiene las localizaciones para trazar el historial de ruta de dispositivos seleccionados. */
dispositivoRouter.get('/obtenerLocalizaciones',
  asyncHandler(async (solicitud, respuesta) => {
    const idUsuario = solicitud.sesion.idUsuario;
    const clavesParametro = solicitud.query['claves'];
    const claves = (Array.isArray(clavesParametro) ? clavesParametro : [clavesParametro])
      .flatMap(valor => typeof valor === 'string' ? valor.split(',') : [])
      .map(clave => clave.trim())
      .filter(Boolean);
    const fechaInicial = typeof solicitud.query['fechaInicial'] === 'string'
      ? solicitud.query['fechaInicial'] as string : undefined;
    const fechaFinal = typeof solicitud.query['fechaFinal'] === 'string'
      ? solicitud.query['fechaFinal'] as string : undefined;
    const clavesValidas = claves.every(clave =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clave)
    );

    if (claves.length > 100 || !clavesValidas || (fechaInicial && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fechaInicial)) ||
      (fechaFinal && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fechaFinal))) {
      throw new ErrorHttp(400, 'Los filtros de localización no son válidos.');
    }

    const datos = await obtenerHistorialLocalizaciones(idUsuario, claves, fechaInicial, fechaFinal);
    respuesta.status(200).json({ mensaje: 'Historial de localizaciones obtenido exitosamente.', datos });
  })
);

/**
 * Obtiene los certificados para el celular
 */
dispositivoRouter.get('/obtener-certificados',
  asyncHandler(async (solicitud, respuesta) => {

    const datos = {
      tipo: 'Y',
      cualidades: null
    }

    const clave = await crearPreDispositivo(datos);
    const certificados = await crearCertificadoCelular(clave);

    respuesta.status(200).json({
      mensaje: 'Certificados obtenidos exitosamente.',
      datos: certificados
    });
  })
);
