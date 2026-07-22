import sql from 'mssql';
import { pool } from '../recursos/base-datos';

export interface Dispositivo {
  id: number;
  idUsuario: number;
  idPreDispositivo: number;
  alias: string;
  telefono: string | null;
  clave: string;
}

export interface DatosCrear {
  claveDispositivo: string;
  alias: string;
  telefono: string;
  idUsuario: number
}

export interface DatosActualizar {
  clave: string;
  telefono: string;
  alias: string;
}

export interface DispositivoClave {
  clave: string;
  idUsuario: number;
  alias: string;
  telefono: string;
  fechaFinalSuscripcion: Date | null;
  cualidades: string;
}

export interface LocalizacionDispositivo {
  aliasDispositivo: string;
  latitud: number;
  longitud: number;
  altitud: number;
}


export async function buscarPorClave(clave: string, idUsuario: number): Promise<any | null> {
  const resultado = await pool.request()
    .input('clave', sql.VarChar(50), clave)
    .query(`
      SELECT
        pd.id AS idPreDispositivo,
        d.id AS idDispositivo,
        d.id_usuario,
        d.alias,
        d.telefono
      FROM pre_dispositivos pd
      LEFT JOIN dispositivos d
        ON d.id_pre_dispositivo = pd.id
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @clave);
    `);

  if (resultado.recordset.length === 0) {
    throw new Error('La clave del pre dispositivo no existe.');
  }

  const registro = resultado.recordset[0];

  // La clave existe pero todavía no está vinculada
  if (!registro.alias) {
    return null;
  }

  // La clave pertenece a otro usuario
  if (registro.idUsuario != idUsuario) {
    throw new Error('No tiene permiso para acceder a este dispositivo.');
  }

  // La clave pertenece al usuario correcto
  return {
    alias: registro.alias,
    telefono: registro.telefono
  };
}

export async function crear(datos: DatosCrear): Promise<number> {

  const validacion = await pool.request()
    .input('claveDispositivo', sql.VarChar(50), datos.claveDispositivo)
    .query(`
      SELECT
        pd.id AS idPreDispositivo,
        d.id AS idDispositivo
      FROM pre_dispositivos pd
      LEFT JOIN dispositivos d
        ON d.id_pre_dispositivo = pd.id
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo);
    `);
  if (validacion.recordset.length === 0) {
    throw new Error('La clave del pre dispositivo no existe.');
  }

  const registro = validacion.recordset[0];

  if (registro.idDispositivo) {
    throw new Error('La clave del pre dispositivo ya está siendo utilizada.');
  }

  const resultado = await pool.request()
    .input('idUsuario', sql.Int, datos.idUsuario)
    .input('idPreDispositivo', sql.Int, registro.idPreDispositivo)
    .input('alias', sql.VarChar(100), datos.alias || null)
    .input('telefono', sql.VarChar(20), datos.telefono || null)
    .query(`
      DECLARE @insertado TABLE (id INT);

      INSERT INTO dispositivos (
        id_usuario,
        id_pre_dispositivo,
        alias,
        telefono
      )
      OUTPUT INSERTED.id INTO @insertado
      VALUES (
        @idUsuario,
        @idPreDispositivo,
        @alias,
        @telefono
      );

      SELECT id FROM @insertado;
    `);


  return resultado.recordset[0].id;
}

export async function obtenerDatosDispositivos(): Promise<DispositivoClave[]> {
  const resultado = await pool.request()
    .query(`
      SELECT 
          dis.id_usuario,
          prd.clave,
          sus.fecha_final,
          dis.alias,
          dis.telefono,
          prd.cualidades
      FROM dispositivos dis
      INNER JOIN pre_dispositivos prd
          ON prd.id = dis.id_pre_dispositivo
      OUTER APPLY (
          SELECT TOP 1
              s.fecha_final
          FROM suscripciones s
          WHERE s.id_dispositivo = dis.id
          ORDER BY s.fecha_final DESC
      ) sus
      WHERE prd.estatus = 1;
    `);

  return resultado.recordset;
}

export async function actualizar(datos: DatosActualizar): Promise<void> {
  await pool.request()
    .input('clave', sql.UniqueIdentifier, datos.clave)
    .input('telefono', sql.VarChar, datos.telefono)
    .input('alias', sql.VarChar, datos.alias)
    .query(`
      UPDATE dis
      SET
        dis.alias = @alias,
        dis.telefono = @telefono
      FROM dispositivos dis
      INNER JOIN pre_dispositivos pd
        ON pd.id = dis.id_pre_dispositivo
      WHERE pd.clave = @clave;
    `);
}


/**
 * Obtiene las localizaciones de un dispositivo.
 * @param claveDispositivo UUID del dispositivo.
 */
export async function obtenerLocalizaciones(
  claveDispositivo: string
): Promise<LocalizacionDispositivo[]> {

  const consulta = await pool.request()
    .input('claveDispositivo', sql.VarChar(50), claveDispositivo)
    .query(`
            SELECT
                d.alias AS aliasDispositivo,
                l.latitud,
                l.longitud,
                l.altitud
            FROM localizaciones l
            INNER JOIN dispositivos d
                ON d.id = l.id_dispositivo
            INNER JOIN pre_dispositivos pd
                ON pd.id = d.id_pre_dispositivo
            WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo)
            ORDER BY l.id;
        `);

  return consulta.recordset;
}