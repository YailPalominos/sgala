import sql from 'mssql';
import { conexionPool } from '../configuracion/base-datos';

/**
 * Interfaz que representa un registro de la tabla `dispositivos`.
 */
export interface Dispositivo {
  id: number;
  uuid: string;
  id_usuario: number;
  id_pre_dispositivo: number;
  telefono: string;
  creado_en: Date;
}

/**
 * Datos necesarios para crear un nuevo dispositivo.
 */
export interface DatosCrearDispositivo {
  id_usuario: number;
  id_pre_dispositivo: number;
  telefono: string;
}

/**
 * Crea un nuevo dispositivo en la tabla `dispositivos`.
 * El UUID se genera automáticamente por la base de datos (DEFAULT NEWID()).
 * Retorna el registro completo del dispositivo creado.
 */
export async function crearDispositivo(datos: DatosCrearDispositivo): Promise<Dispositivo> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('id_usuario', sql.Int, datos.id_usuario)
    .input('id_pre_dispositivo', sql.Int, datos.id_pre_dispositivo)
    .input('telefono', sql.VarChar(20), datos.telefono)
    .query<Dispositivo>(
      `INSERT INTO dispositivos (id_usuario, id_pre_dispositivo, telefono)
       OUTPUT INSERTED.id, INSERTED.uuid, INSERTED.id_usuario, INSERTED.id_pre_dispositivo, INSERTED.telefono, INSERTED.creado_en
       VALUES (@id_usuario, @id_pre_dispositivo, @telefono)`
    );

  return resultado.recordset[0];
}

/**
 * Lista todos los dispositivos que pertenecen a un usuario.
 * @param idUsuario - ID del usuario propietario
 * @returns Arreglo de dispositivos del usuario
 */
export async function listarPorUsuario(idUsuario: number): Promise<Dispositivo[]> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('id_usuario', sql.Int, idUsuario)
    .query<Dispositivo>(
      `SELECT id, uuid, id_usuario, id_pre_dispositivo, telefono, creado_en
       FROM dispositivos
       WHERE id_usuario = @id_usuario`
    );

  return resultado.recordset;
}

/**
 * Busca un dispositivo por su ID numérico.
 * @param id - ID del dispositivo
 * @returns El dispositivo encontrado o null si no existe
 */
export async function buscarPorId(id: number): Promise<Dispositivo | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('id', sql.Int, id)
    .query<Dispositivo>(
      `SELECT id, uuid, id_usuario, id_pre_dispositivo, telefono, creado_en
       FROM dispositivos
       WHERE id = @id`
    );

  return resultado.recordset[0] ?? null;
}

/**
 * Busca un dispositivo por su UUID.
 * @param uuid - UUID del dispositivo
 * @returns El dispositivo encontrado o null si no existe
 */
export async function buscarPorUuid(uuid: string): Promise<Dispositivo | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('uuid', sql.UniqueIdentifier, uuid)
    .query<Dispositivo>(
      `SELECT id, uuid, id_usuario, id_pre_dispositivo, telefono, creado_en
       FROM dispositivos
       WHERE uuid = @uuid`
    );

  return resultado.recordset[0] ?? null;
}
