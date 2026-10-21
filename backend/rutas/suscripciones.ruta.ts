import { Router } from 'express';
import {
  obtenerSuscripcionesDispositivo,
  obtenerResumenSuscripcionDispositivo,
  crearSuscripcion,
  obtenerSuscripciones,
  obtenerFechaFinalSuscripcion
} from '../repositorios/base-datos/datos.repositorio';
export const suscripcionesRoute = Router();
import asyncHandler from 'express-async-handler';
import { enviarDispositivoActualizado } from '../socket'
import { actualizarDatosDispositivo } from '@/repositorios/redis/dispositivo.redis';
import { obtenerPrecios } from '@/repositorios/redis/datos.redis';


/**
 * Obtiene las suscripciones de un dipositivo
 */
suscripcionesRoute.get('/obtener-suscripciones-dispositivo/:claveDispositivo',
  asyncHandler(async (solicitud, respuesta) => {

    const { claveDispositivo } = solicitud.params;

    if (!claveDispositivo) {
      throw new Error('La clave del dispositivo es requerida.');
    }

    const datos = await obtenerSuscripcionesDispositivo(claveDispositivo);

    respuesta.status(200).json({
      datos,
      mensaje: 'Suscripciónes del dispositivo obtenidas exitosamente.'
    });

  })
);


/**
 * Obtiene el resumen del tipo de suscripción del dispositivo
 */
suscripcionesRoute.get('/obtener-resumen-suscripcion-dispositivo/:claveDispositivo/:tipoSuscripcion',
  asyncHandler(async (solicitud, respuesta) => {

    const { claveDispositivo } = solicitud.params;

    const { tipoSuscripcion } = solicitud.params;

    if (!['G', 'S', 'A'].includes(tipoSuscripcion)) {
      throw new Error('Tipo de suscripción inválido.');
    }

    const datos = await obtenerResumenSuscripcionDispositivo(claveDispositivo, tipoSuscripcion);

    const precios = await obtenerPrecios();

    let total = 0;

    const cualidades = datos.cualidades.split(',');

    const detalles = cualidades.map((clave: string) => {

      let precio = 0;

      // La suscripción gratuita no tiene tarifas
      if (tipoSuscripcion !== 'G') {

        const precioSuscripcion = precios.find(
          (p: any) => p.tipo === tipoSuscripcion
        );

        if (!precioSuscripcion) {
          throw new Error('Tipo de suscripción no configurado.');
        }

        precio = (precioSuscripcion as any)[clave] ?? 0;

        total += precio;
      }

      return {
        clave,
        descripcion:
          clave === 'LOC'
            ? 'Localizadores'
            : clave === 'ALA'
              ? 'Alarmas'
              : clave === 'COC'
                ? 'Control de consumo'
                : clave,
        precio
      };
    });

    datos.total = total
    datos.detalles = detalles

    respuesta.status(200).json({
      datos,
      mensaje: 'Suscripción validada exitosamente.'
    });

  })
);

/**
 * Solicita al servidor los precios
 */
suscripcionesRoute.post('/crear',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body

    const { claveDispositivo } = datos;
    const { tipoSuscripcion } = datos;

    if (!['G', 'S', 'A'].includes(tipoSuscripcion)) {
      throw new Error('Tipo de suscripción inválido.');
    }

    await crearSuscripcion(claveDispositivo, tipoSuscripcion)

    const fechaFinal = await obtenerFechaFinalSuscripcion(claveDispositivo)
    actualizarDatosDispositivo(claveDispositivo, { fechaFinal })

    await enviarDispositivoActualizado(claveDispositivo)

    respuesta.status(200).json({
      datos: {},
      mensaje: 'Suscripción creada exitosamente.'
    });
  })
);

/**
 * Obtener una lista de las suscripciones
 */
suscripcionesRoute.get('/obtener-lista',
  asyncHandler(async (solicitud, respuesta) => {

    const filtros = solicitud.query
    const idUsuario = solicitud.sesion.idUsuario;

    const suscripciones = await obtenerSuscripciones(idUsuario, filtros);

    respuesta.status(200).json({
      datos: suscripciones,
      mensaje: 'Suscripción creada exitosamente.'
    });
  })
);