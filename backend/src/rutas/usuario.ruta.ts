import { Router } from 'express';
import * as autenticacionServicio from '../servicios/autenticacion.servicio';
import { actualizar, obtenerUsuarioPorId, validarNoDuplicadoActualizacion } from '../repositorios/base-datos/usuario.repositorio';
export const autenticacionRouter = Router();
import asyncHandler from 'express-async-handler';
import { crearLlaveRecuperacion, eliminarSesion } from '@/repositorios/redis/sesiones.redis';
import { agregarSuscripcion } from '@/repositorios/redis/suscripciones.redis';
import { ErrorHttp } from '@/interceptores/error.middleware';
import { confirmarPreCambio, crearPreCambio, eliminarPreCambioPorUsuario } from '@/repositorios/redis/pre-cambios.redis';
import { enviarCorreoConfirmacionCambios } from '@/servicios/correo.servicio';

/**
 * Registra un pre-usuario. Guarda los datos temporalmente en Redis (24 h)
 * y envía al correo una clave (UUID) para confirmar el registro.
 * El usuario aún no se crea en la base de datos.
 */
autenticacionRouter.post('/crear',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = solicitud.body;
    await autenticacionServicio.crear(datos);
    respuesta.status(202).json({
      mensaje: 'Te enviamos un correo para confirmar tu registro. El enlace expira en 24 horas.',
    });
  })
);

/**
 * Confirma el registro mediante la clave (UUID) recibida por correo.
 * Crea el usuario en la base de datos y le envía su contraseña provisional.
 */
autenticacionRouter.get('/confirmar/:clave',
  asyncHandler(async (solicitud, respuesta) => {

    const { clave } = solicitud.params;
    await autenticacionServicio.confirmar(clave);

    respuesta.status(200).json({
      mensaje: 'Tu cuenta fue confirmada. Revisa tu correo para obtener tu contraseña provisional.',
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
      const claveLLaveRecuperacion = await crearLlaveRecuperacion(resultado.idUsuario, 'A');
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
    await eliminarSesion(solicitud.sesion.clave);
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

    const claveLLaveRecuperacion = await crearLlaveRecuperacion(solicitud.sesion.idUsuario, 'A');

    respuesta.status(200).json({
      datos: claveLLaveRecuperacion,
      mensaje: 'Llave de recuperación obtenida exitosamente.'
    });
  })
);

/**
 * Cambia la contraseña usando una llave de recuperación válida.
 */
autenticacionRouter.put('/cambiar',
  asyncHandler(async (solicitud, respuesta) => {
    const { llave, nuevaContraseña } = solicitud.body;
    await autenticacionServicio.cambiarContrasena(llave, nuevaContraseña);
    respuesta.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente.'
    });
  })
);

/**
 * Usuario actualiza sus datos 
 */
autenticacionRouter.put('/actualizar',
  asyncHandler(async (solicitud, respuesta) => {

    const datos = solicitud.body;

    if (datos.clave !== solicitud.sesion.claveUsuario) {
      throw new ErrorHttp(
        403,
        'No tiene permisos para actualizar este usuario.'
      );
    }

    const usuario = await obtenerUsuarioPorId(solicitud.sesion.idUsuario)

    await validarNoDuplicadoActualizacion(
      usuario.id,
      datos.alias ?? usuario.alias,
      datos.direccionCorreoElectronico ?? usuario.direccionCorreoElectronico,
      datos.telefono ?? usuario.telefono,
    );

    const teniaCambioPendiente = await eliminarPreCambioPorUsuario(usuario.clave);

    const cambioCorreo = usuario.direccionCorreoElectronico !== datos.direccionCorreoElectronico;
    const cambioTelefono = usuario.telefono !== datos.telefono;

    if (cambioCorreo || cambioTelefono) {


      const claves = await crearPreCambio({
        claveUsuario: usuario.clave,

        ...(cambioCorreo && {
          direccionCorreoElectronico: datos.direccionCorreoElectronico
        }),

        ...(cambioTelefono && {
          telefono: datos.telefono
        })
      });

      if (cambioCorreo == true) {

        if (!claves.claveVerificacionDireccionCorreoElectronico) {
          throw new Error('No se generó la clave de verificación del correo.');
        }

        await enviarCorreoConfirmacionCambios(
          {
            alias: usuario.alias,
            correoAnterior: usuario.direccionCorreoElectronico,
            correoNuevo: datos.direccionCorreoElectronico,
          },
          claves.claveVerificacionDireccionCorreoElectronico
        );
      }


      if (cambioTelefono == true) {

      }

      const mensaje = teniaCambioPendiente
        ? cambioCorreo && cambioTelefono
          ? 'La solicitud de cambio anterior fue cancelada. Se enviará un nuevo enlace de verificación a tu correo electrónico y un nuevo código de verificación por SMS a tu teléfono. Ignora cualquier enlace o código recibido anteriormente.'
          : cambioCorreo
            ? 'La solicitud de cambio anterior fue cancelada. Se enviará un nuevo enlace de verificación a tu correo electrónico. Ignora cualquier enlace recibido anteriormente.'
            : 'La solicitud de cambio anterior fue cancelada. Se enviará un nuevo código de verificación por SMS a tu teléfono. Ignora cualquier código recibido anteriormente.'
        : cambioCorreo && cambioTelefono
          ? 'Se enviará un enlace de verificación a tu nuevo correo electrónico y un código de verificación por SMS a tu nuevo teléfono.'
          : cambioCorreo
            ? 'Se enviará un enlace de verificación a tu nuevo correo electrónico para confirmar el cambio.'
            : 'Se enviará un código de verificación por SMS a tu nuevo teléfono para confirmar el cambio.';

      respuesta.status(202).json({ mensaje });


    } else {
      await actualizar(datos);
      respuesta.status(200).json({
        mensaje: 'Actualización realizada exitosamente.'
      });
    }
  })
);

/**
 * Solicita al servidor una llave para cambiar contraseña, estando autenticado
 */
autenticacionRouter.get('/solicitar-llave-recuperacion',
  asyncHandler(async (solicitud, respuesta) => {

    const claveLLaveRecuperacion = await crearLlaveRecuperacion(solicitud.sesion.idUsuario, 'A');

    respuesta.status(200).json({
      datos: claveLLaveRecuperacion,
      mensaje: 'Llave de recuperación obtenida exitosamente.'
    });
  })
);

/**
 * Solicita al servidor suscribirse a las notificaciones
 */
autenticacionRouter.post('/suscribir-a-notificaciones',
  asyncHandler(async (solicitud, respuesta) => {
    const suscripcion = solicitud.body;
    await agregarSuscripcion(solicitud.sesion.idUsuario, suscripcion);
    respuesta.status(200).json({
      mensaje: 'Se ha suscrito al servicio de notificaciones exitosamente.'
    });
  })
);

/**
 * Solicita al servidor verificar el código
 */
autenticacionRouter.get('/verificar-codigo/:tipo/:codigo',
  asyncHandler(async (solicitud, respuesta) => {

    const { tipo, codigo } = solicitud.params;

    let datos;

    if (tipo === 'usuario') {
      datos = await autenticacionServicio.verificarCodigo(codigo);
    } else if (
      tipo === 'correo' ||
      tipo === 'telefono'
    ) {
      datos = await autenticacionServicio.verificarCodigoPreCambio(codigo);
    } else {
      throw new Error('Tipo de verificación no válido.');
    }

    respuesta.status(200).json({
      mensaje: 'Código de verificación validado exitosamente.',
      datos
    });
  })
);

/**
 * Solicita al servidor confirmar el codigo para crear cuenta
 */
autenticacionRouter.post('/confirmar-codigo',
  asyncHandler(async (solicitud, respuesta) => {
    const { codigo, tipo } = solicitud.body;

    if (tipo === 'usuario') {
      await autenticacionServicio.confirmar(codigo);
    } else if (
      tipo === 'correo' ||
      tipo === 'telefono'
    ) {

      const resultado = await confirmarPreCambio(codigo, tipo);

      if (resultado.estaFinalizado && resultado.datos) {
        const cambio = resultado.datos;

        await actualizar({
          clave: cambio.claveUsuario,
          ...(cambio.direccionCorreoElectronico !== undefined && {
            direccionCorreoElectronico: cambio.direccionCorreoElectronico
          }),
          ...(cambio.telefono !== undefined && {
            telefono: cambio.telefono
          })
        });

        respuesta.status(200).json({
          mensaje: 'El código se ha verificado exitosamente y los datos del usuario se han actualizado.'
        });

      } else {
        const pendientes = resultado.verificacionPendiente
          .map(tipo => tipo === 'correo' ? 'correo electrónico' : 'teléfono');

        respuesta.status(202).json({
          mensaje: `El código se ha verificado exitosamente. Falta confirmar el ${pendientes.join(' y el ')} para completar la actualización.`
        });
      }

    }

    respuesta.status(200).json({
      mensaje: 'El codigo se ha verificado exitosamente, usuario creado.'
    });
  })
);
