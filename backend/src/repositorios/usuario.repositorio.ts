import sql from 'mssql';
import { conexionPool } from '../configuracion/base-datos';

/**
 * Interfaz que representa un registro de la tabla `usuarios`.
 */
export interface Usuario {
  id: number;
  alias: string;
  correo: string;
  contrasena: string;
  estatus: number;
  creado_en: Date;
}

/**
 * Datos requeridos para crear un nuevo usuario.
 */
export interface DatosCrearUsuario {
  alias: string;
  correo: string;
  contrasena: string;
}

/**
 * Repositorio de usuarios — acceso a la tabla `usuarios` en SQL Server.
 */

/**
 * Inserta un nuevo usuario en la tabla `usuarios` con estatus 1.
 * Retorna el registro completo del usuario creado.
 */
export async function crearUsuario(datos: DatosCrearUsuario): Promise<Usuario> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('alias', sql.VarChar(50), datos.alias)
    .input('correo', sql.VarChar(100), datos.correo)
    .input('contrasena', sql.VarChar(255), datos.contrasena)
    .query<Usuario>(
      `INSERT INTO usuarios (alias, correo, contrasena, estatus)
       OUTPUT INSERTED.*
       VALUES (@alias, @correo, @contrasena, 1);`
    );

  return resultado.recordset[0];
}

/**
 * Busca un usuario por su alias.
 * Retorna el usuario encontrado o null si no existe.
 */
export async function buscarPorAlias(alias: string): Promise<Usuario | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('alias', sql.VarChar(50), alias)
    .query<Usuario>('SELECT * FROM usuarios WHERE alias = @alias');

  return resultado.recordset[0] ?? null;
}

/**
 * Busca un usuario por su dirección de correo electrónico.
 * Retorna el usuario encontrado o null si no existe.
 */
export async function buscarPorCorreo(correo: string): Promise<Usuario | null> {
  const pool = await conexionPool;
  const resultado = await pool
    .request()
    .input('correo', sql.VarChar(100), correo)
    .query<Usuario>('SELECT * FROM usuarios WHERE correo = @correo');

  return resultado.recordset[0] ?? null;
}

/**
 * Actualiza la contraseña cifrada de un usuario dado su id.
 */
export async function actualizarContrasena(
  idUsuario: number,
  hashContrasena: string
): Promise<void> {
  const pool = await conexionPool;
  await pool
    .request()
    .input('id', sql.Int, idUsuario)
    .input('contrasena', sql.VarChar(255), hashContrasena)
    .query('UPDATE usuarios SET contrasena = @contrasena WHERE id = @id');
}
