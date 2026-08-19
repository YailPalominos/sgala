import { Router } from 'express';
import { obtenerLista, obtenerDatosElemento } from '../repositorios/base-datos/evento.repositorio';
export const eventoRouter = Router();
import asyncHandler from 'express-async-handler';

/**
 * Solicita la lista de los eventos
 */
eventoRouter.get('/obtener-lista',
    asyncHandler(async (solicitud, respuesta) => {

        const filtros = solicitud.query
        const idUsuario = solicitud.sesion.idUsuario;

        const datos = await obtenerLista(idUsuario, filtros);

        respuesta.status(200).json({
            datos: datos,
            mensaje: 'Eventos obtenidos exitosamente.'
        });
    })
);


/**
 * Solicita al servidor los datos del elemento
 */
eventoRouter.get('/obtener-datos-elemento/:idElemento',
    asyncHandler(async (solicitud, respuesta) => {

        const idElemento = Number(solicitud.params.idElemento);

        const datos = await obtenerDatosElemento(idElemento);

        respuesta.status(200).json({
            datos: datos,
            mensaje: 'Datos del elemento obtenidos exitosamente.'
        });
    })
);


