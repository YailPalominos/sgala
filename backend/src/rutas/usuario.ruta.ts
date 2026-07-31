import { Router } from 'express';
import * as autenticacionServicio from '../servicios/autenticacion.servicio';
import { sesionServicio } from '../servicios/sesion.servicio';
import { actualizar } from '../repositorios/usuario.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
export const autenticacionRouter = Router();
import asyncHandler from 'express-async-handler';

/**
 * Verifica que la clave del pre usuario exista y no esté siendo usada.
 */
autenticacionRouter.get(
  '/validar-clave/:clave',
  asyncHandler(async (solicitud, respuesta) => {
    const { clave } = solicitud.params;

    const datosUsuario = await autenticacionServicio.validarClave(clave);

    if (!datosUsuario) {
      respuesta.status(200).json({
        mensaje: 'Clave disponible',
        datos: clave
      });
    }

    respuesta.status(202).json({
      mensaje: 'La clave ya está siendo utilizada por otro usuario',
      datos: datosUsuario
    });
  })
);

/**
 * Registra un nuevo usuario. El servidor genera una contraseña provisional
 * y la envía por correo electrónico junto al alias.
 */
autenticacionRouter.post('/crear',
  asyncHandler(async (solicitud, respuesta) => {

    const datos = solicitud.body;
    await autenticacionServicio.crear(datos);

    respuesta.status(202).json({
      mensaje: 'El usuario fue creado exitosamente.',
    });
  })
);

/**
 * Inicia sesión. Responde 200 si la sesión es normal, 202 si debe cambiar contraseña.
 */
autenticacionRouter.post('/iniciar-sesion',
  asyncHandler(async (solicitud, respuesta) => {
    const { identificador, contraseña } = solicitud.body;
    const resultado = await autenticacionServicio.autenticar(identificador, contraseña);
    if (resultado.requiereCambioContrasena) {
      if (resultado.idUsuario === undefined) {
        throw new Error('idUsuario no definido para cambio de contraseña.');
      }
      const claveLLaveRecuperacion = await redisRepositorio.crearLlaveRecuperacion(resultado.idUsuario, 'A');
      respuesta.status(202).json({ mensaje: 'Debe cambiar su contraseña', datos: claveLLaveRecuperacion });
    } else {
      respuesta.status(200).json({ datos: resultado.sesion, mensaje: 'Inicio de sesión exitoso' });
    }
  })
);

/**
 * Cierra la sesión del usuario autenticado.
 */
autenticacionRouter.post('/cerrar-sesion',
  asyncHandler(async (solicitud, respuesta) => {
    await sesionServicio.eliminarSesion(solicitud.sesion.clave);
    respuesta.status(200).json({
      mensaje: 'Sesión cerrada exitosamente'
    });
  })
);



/**
 * Solicita al servidor enviar vía correo electrónico un enlace de recuperación de contraseña.
 */
autenticacionRouter.get('/verificar-identidad/:identificador',
  asyncHandler(async (solicitud, respuesta) => {

    const { identificador } = solicitud.params;
    const datos = await autenticacionServicio.verificarIdentidad(identificador);

    respuesta.status(200).json({
      mensaje: 'Identidad verficiada exitosamente.',
      datos
    });
  })
);

/**
 * Solicita al servidor enviar vía correo electrónico un enlace de recuperación de contraseña.
 */
autenticacionRouter.post('/solicitar-recuperacion',
  asyncHandler(async (solicitud, respuesta) => {
    const { identificador, tipo } = solicitud.body;
    await autenticacionServicio.solicitarRecuperacion(identificador, tipo);
    respuesta.status(200).json({
      mensaje: 'Se ha enviado el enlace para restablecer su contraseña.'
    });
  })
);


/**
 * Solicita al servidor una llave para cambiar contraseña, estando autenticado
 */
autenticacionRouter.post('/solicitar-llave-recuperacion',
  asyncHandler(async (solicitud, respuesta) => {

    const claveLLaveRecuperacion = await redisRepositorio.crearLlaveRecuperacion(solicitud.sesion.idUsuario, 'A');

    respuesta.status(200).json({
      datos: claveLLaveRecuperacion,
      mensaje: 'Llave de recuperación obtenida exitosamente.'
    });
  })
);


/**
 * Cambia la contraseña usando una llave de recuperación válida.
 */
autenticacionRouter.post('/cambiar',
  asyncHandler(async (solicitud, respuesta) => {
    const { llave, nuevaContraseña } = solicitud.body;
    await autenticacionServicio.cambiarContrasena(llave, nuevaContraseña);
    respuesta.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente.'
    });
  })
);


/**
 * Solicita un enlace de recuperación de contraseña.
 */
autenticacionRouter.post('/actualizar',
  asyncHandler(async (solicitud, respuesta) => {

    const { alias, direccionCorreoElectronico, telefono } = solicitud.body;

    const datosUsuarioActualizar = {
      idUsuario: solicitud.sesion.idUsuario,
      alias,
      direccionCorreoElectronico,
      telefono
    }

    await actualizar(datosUsuarioActualizar);

    respuesta.status(200).json({
      mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación.'
    });
  })
);


/**
 * Solicita al servidor una llave para cambiar contraseña, estando autenticado
 */
autenticacionRouter.post('/solicitar-llave-recuperacion',
  asyncHandler(async (solicitud, respuesta) => {

    const claveLLaveRecuperacion = await redisRepositorio.crearLlaveRecuperacion(solicitud.sesion.idUsuario, 'A');

    respuesta.status(200).json({
      datos: claveLLaveRecuperacion,
      mensaje: 'Llave de recuperación obtenida exitosamente.'
    });
  })
);