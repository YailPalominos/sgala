import sql from 'mssql';
import { pool } from '../recursos/base-datos';

export interface Solicitud {
    descripcion: string;
    medioContacto?: string;
}

export async function crear(solicitud: Solicitud) {

  await pool.request()
    .input(
      'descripcion',
      sql.VarChar(1000),
      solicitud.descripcion.trim()
    )
    .input(
      'medioContacto',
      sql.VarChar(50),
      solicitud.medioContacto
        ? solicitud.medioContacto.trim()
        : null
    )
    .query(
      `INSERT INTO solicitudes (descripcion, medio_contacto, estatus)
       VALUES (@descripcion, @medioContacto, 1)`
    );

}