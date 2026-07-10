import sql from 'mssql';
import { conexionPool } from '../configuracion/base-datos';

export interface PreDispositivo {
  id: number;
  uuid: string;
  creado_en: Date;
}

/**
 * Busca un pre-dispositivo por su UUID en la tabla `pre_dispositivos`.
 * @param uuid - UUID del pre-dispositivo a buscar
 * @returns El pre-dispositivo encontrado o null si no existe
 */
export async function buscarPorUuid(uuid: string): Promise<PreDispositivo | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('uuid', sql.UniqueIdentifier, uuid)
    .query<PreDispositivo>('SELECT id, uuid, creado_en FROM pre_dispositivos WHERE uuid = @uuid');

  return resultado.recordset[0] ?? null;
}

/**
 * Verifica si un pre-dispositivo ya está vinculado a un dispositivo.
 * @param idPreDispositivo - ID del pre-dispositivo a verificar
 * @returns true si ya está vinculado, false en caso contrario
 */
export async function estaVinculado(idPreDispositivo: number): Promise<boolean> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('idPreDispositivo', sql.Int, idPreDispositivo)
    .query<{ total: number }>(
      'SELECT COUNT(*) AS total FROM dispositivos WHERE id_pre_dispositivo = @idPreDispositivo'
    );

  return resultado.recordset[0].total > 0;
}
