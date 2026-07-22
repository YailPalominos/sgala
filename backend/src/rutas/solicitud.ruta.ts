import { Router, Request, Response, NextFunction } from 'express';
import sql from 'mssql';
import { pool } from '../recursos/base-datos';

export const solicitudRouter = Router();

/**
 * POST /api/solicitudes
 * Crea una solicitud de ayuda/contacto. No requiere autenticación.
 * Body: { descripcion, direccionCorreoElectronico?, telefono? }
 */
solicitudRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { descripcion, medioContacto } = req.body;


    await pool.request()
      .input('descripcion', sql.VarChar(1000), descripcion.trim())
      .input('medioContacto', sql.VarChar(50), medioContacto?.trim())
      .query(
        `INSERT INTO solicitudes (descripcion, medio_contacto, estatus)
         VALUES (@descripcion, @medioContacto, 1)`
      );

    res.status(201).json({ mensaje: 'Solicitud enviada exitosamente' });
  } catch (error) {
    next(error);
  }
});
