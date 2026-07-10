import { conexionPool } from '../configuracion/base-datos';

/**
 * Interfaz que representa un registro de localización almacenado en la tabla `localizaciones`.
 */
export interface Localizacion {
  id: number;
  id_dispositivo: number;
  latitud: number;
  longitud: number;
  altitud: number;
  creado_en: Date;
}

/**
 * Inserta un nuevo registro de localización para un dispositivo.
 * Se persiste cuando la distancia respecto a la última localización supera el umbral
 * o cuando es la primera localización del dispositivo.
 *
 * @param idDispositivo - Identificador del dispositivo en la tabla `dispositivos`
 * @param latitud - Latitud en formato decimal (DECIMAL 10,7)
 * @param longitud - Longitud en formato decimal (DECIMAL 10,7)
 * @param altitud - Altitud en metros (DECIMAL 8,2)
 */
export async function insertar(
  idDispositivo: number,
  latitud: number,
  longitud: number,
  altitud: number
): Promise<void> {
  const pool = await conexionPool;
  await pool
    .request()
    .input('idDispositivo', idDispositivo)
    .input('latitud', latitud)
    .input('longitud', longitud)
    .input('altitud', altitud)
    .query(
      `INSERT INTO localizaciones (id_dispositivo, latitud, longitud, altitud)
       VALUES (@idDispositivo, @latitud, @longitud, @altitud)`
    );
}

/**
 * Obtiene la localización más reciente de un dispositivo.
 * Usa el índice ix_localizaciones_dispositivo_fecha para optimizar la consulta.
 *
 * @param idDispositivo - Identificador del dispositivo
 * @returns La localización más reciente o null si no existe ninguna
 */
export async function obtenerUltima(
  idDispositivo: number
): Promise<Localizacion | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('idDispositivo', idDispositivo)
    .query<Localizacion>(
      `SELECT TOP 1 id, id_dispositivo, latitud, longitud, altitud, creado_en
       FROM localizaciones
       WHERE id_dispositivo = @idDispositivo
       ORDER BY creado_en DESC`
    );

  return resultado.recordset[0] ?? null;
}
