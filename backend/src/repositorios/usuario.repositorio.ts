import sql from 'mssql';
import { pool } from '../recursos/base-datos';

export interface Usuario {
  id: number;
  alias: string;
  direccionCorreoElectronico: string;
  contrasena: string;
  telefono: string;
  estatus: boolean;
}

export interface DatosCrearUsuario {
  alias: string;
  direccionCorreoElectronico: string;
  contrasena: string;
  telefono:string;
  idPreUsuario: number;
}

export interface DatosActualizarUsuario {
  idUsuario: number;
  alias: string;
  direccionCorreoElectronico: string;
  telefono: string
}

export async function buscarPorClave(clave: string): Promise<any | null> {
  const resultado = await pool.request()
    .input('clave', sql.VarChar(50), clave)
    .query(`
      SELECT
        pu.id AS idPreUsuario,
        u.alias,
        u.direccion_correo_electronico,
        u.telefono
      FROM pre_usuarios pu
      LEFT JOIN usuarios u
        ON u.id_pre_usuario = pu.id
      WHERE pu.clave = TRY_CONVERT(uniqueidentifier, @clave);
    `);

  if (resultado.recordset.length === 0) {
    throw new Error('La clave del pre usuario no existe.');
  }

  const registro = resultado.recordset[0];

  // La clave existe pero todavía no está vinculada
  if (!registro.alias) {
    return null;
  }

  // La clave ya tiene un usuario asociado
  return {
    telefono: registro.telefono,
    alias: registro.alias,
    direccionCorreoElectronico: registro.direccionCorreoElectronico
  };
}

export async function obtenerIdPreUsuarioPorClave(clave: string): Promise<number> {
  const resultado = await pool.request()
    .input('clave', sql.VarChar(50), clave)
    .query(`
      SELECT
        pu.id AS idPreUsuario,
        u.id AS idUsuario
      FROM pre_usuarios pu
      LEFT JOIN usuarios u
        ON u.id_pre_usuario = pu.id
      WHERE pu.clave = TRY_CONVERT(uniqueidentifier, @clave);
    `);

  if (resultado.recordset.length === 0) {
    throw new Error('La clave del pre usuario no existe.');
  }

  const registro = resultado.recordset[0];

  if (registro.idUsuario) {
    throw new Error('La clave del pre usuario ya está siendo utilizada.');
  }

  return registro.idPreUsuario;
}

export async function crearUsuario(datos: DatosCrearUsuario): Promise<Usuario> {
  const resultado = await pool.request()
    .input('alias', sql.VarChar(50), datos.alias)
    .input('direccionCorreoElectronico', sql.VarChar(100), datos.direccionCorreoElectronico)
    .input('contrasena', sql.VarChar(255), datos.contrasena)
    .input('idPreUsuario', sql.Int, datos.idPreUsuario)
    .input('telefono', sql.VarChar(20), datos.telefono)
    .query(
      `DECLARE @insertado TABLE (id INT);
       INSERT INTO usuarios (alias, direccion_correo_electronico, contrasena, id_pre_usuario, telefono)
       OUTPUT INSERTED.id INTO @insertado
       VALUES (@alias, @direccionCorreoElectronico, @contrasena, @idPreUsuario, @telefono);
       SELECT * FROM usuarios WHERE id = (SELECT id FROM @insertado);`
    );
  return (resultado.recordset)[0];
}

export async function buscarPorIdentificador(identificador: string): Promise<Usuario> {
  const resultado = await pool.request()
    .input('identificador', sql.VarChar(100), identificador)
    .query('SELECT * FROM usuarios WHERE alias = @identificador OR direccion_correo_electronico = @identificador OR telefono = @identificador');

  const usuario = resultado.recordset[0];

  if (!usuario) {
    throw new Error('Usuario no encontrado.');
  }

  if (usuario.estatus != true) {
    throw new Error('Usuario inactivo contacte al administrador.');
  }

  return usuario;
}

/**
 * Busca si ya existe un usuario con el alias, correo o teléfono indicado.
 *
 * @param identificador - Alias, correo electrónico o teléfono.
 * @returns El usuario encontrado o null si no existe.
 */
export async function buscarExistentePorIdentificador(identificador: string): Promise<Usuario | null> {

  const resultado = await pool.request()
    .input('identificador', sql.VarChar(100), identificador)
    .query(`
      SELECT *
      FROM usuarios
      WHERE alias = @identificador
         OR direccion_correo_electronico = @identificador
         OR telefono = @identificador
    `);

  return resultado.recordset[0] ?? null;
}

export async function actualizarContrasena(idUsuario: number, hashContrasena: string): Promise<void> {
  await pool.request()
    .input('id', sql.Int, idUsuario)
    .input('contrasena', sql.VarChar(255), hashContrasena)
    .query('UPDATE usuarios SET contrasena = @contrasena WHERE id = @id');
}

export async function actualizarEstatus(idUsuario: number, estatus: boolean): Promise<void> {
  await pool.request()
    .input('id', sql.Int, idUsuario)
    .input('estatus', sql.Bit, estatus ? 1 : 0)
    .query('UPDATE usuarios SET estatus = @estatus WHERE id = @id');
}

export async function actualizar(datos: DatosActualizarUsuario): Promise<void> {

  await pool.request()
    .input('id', sql.Int, datos.idUsuario)
    .input('alias', sql.VarChar(50), datos.alias)
    .input('direccionCorreoElectronico', sql.VarChar(100), datos.direccionCorreoElectronico)
    .input('telefono', sql.VarChar(20), datos.telefono)
    .query(`
            UPDATE usuarios
            SET
                alias = @alias,
                direccion_correo_electronico = @direccionCorreoElectronico,
                telefono = @telefono
            WHERE id = @id;

            SELECT *
            FROM usuarios
            WHERE id = @id;
        `);
}