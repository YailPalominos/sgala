import { Router, Request, Response, NextFunction } from 'express';
import { ErrorHttp } from '../utilidades/error-http';
import * as autenticacionServicio from '../servicios/autenticacion.servicio';
import { middlewareSesion, RequestAutenticado } from '../middlewares/sesion.middleware';
import { sesionServicio } from '../servicios/sesion.servicio';

export const autenticacionRouter = Router();

/**
 * POST /api/auth/login
 * Inicia sesión y establece cookie httpOnly con el identificador de sesión.
 */
autenticacionRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alias, contrasena } = req.body;

    const sessionId = await autenticacionServicio.login(alias, contrasena);

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000,
    });

    res.status(200).json({ mensaje: 'Inicio de sesión exitoso' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/registro
 * Registra un nuevo usuario validando pre-dispositivo y campos requeridos.
 */
autenticacionRouter.post('/registro', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuidPreDispositivo, alias, correo, contrasena, telefono } = req.body;

    // Validar presencia de campos requeridos
    const camposFaltantes: string[] = [];
    if (!uuidPreDispositivo || !String(uuidPreDispositivo).trim()) camposFaltantes.push('uuidPreDispositivo');
    if (!alias || !String(alias).trim()) camposFaltantes.push('alias');
    if (!correo || !String(correo).trim()) camposFaltantes.push('correo');
    if (!contrasena || !String(contrasena).trim()) camposFaltantes.push('contrasena');
    if (!telefono || !String(telefono).trim()) camposFaltantes.push('telefono');

    if (camposFaltantes.length > 0) {
      throw new ErrorHttp(400, `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`);
    }

    // Delegar al servicio de autenticación
    await autenticacionServicio.registrar({
      uuidPreDispositivo,
      alias,
      correo,
      contrasena,
      telefono,
    });

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Cierra la sesión del usuario autenticado eliminando la sesión de Redis e invalidando la cookie.
 */
autenticacionRouter.post('/logout', middlewareSesion, async (req: RequestAutenticado, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.sessionId;

    await sesionServicio.eliminarSesion(sessionId);

    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/recuperacion/solicitar
 * Solicita un enlace de recuperación de contraseña.
 * Siempre responde 200 para evitar enumeración de cuentas (Requisitos 5.1, 5.2, 5.5).
 * Si el envío del correo falla (ErrorHttp 500), se propaga al manejador de errores.
 */
autenticacionRouter.post('/recuperacion/solicitar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { correo } = req.body;

    await autenticacionServicio.solicitarRecuperacion(correo);

    res.status(200).json({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/recuperacion/cambiar
 * Cambia la contraseña usando una llave de recuperación válida.
 * Responde 200 en éxito, 400 si la llave es inválida/expirada (Requisitos 6.1, 6.2, 6.4).
 */
autenticacionRouter.post('/recuperacion/cambiar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { llave, nuevaContrasena } = req.body;

    await autenticacionServicio.cambiarContrasena(llave, nuevaContrasena);

    res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
});
