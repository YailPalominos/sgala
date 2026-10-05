import { prisma, ejecutarConSesion } from '../../recursos/prisma';
import { obtenerSesion } from '@/interceptores/solicitud';
import { crearEvento } from '@/recursos/evento';

export interface Usuario {
  id: number;
  clave: string;
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
  telefono: string;
  idPreUsuario: number;
}

export interface DatosActualizarUsuario {
  idUsuario: number;
  alias: string;
  direccionCorreoElectronico: string;
  telefono: string
}

export interface UsuarioAdministrativo {
  id: number;
  alias: string;
  direccionCorreoElectronico: string;
  telefono: string | null;
  estatus: boolean;
}

export async function obtenerListaAdministrativa(): Promise<UsuarioAdministrativo[]> {
  return prisma.$queryRaw<UsuarioAdministrativo[]>`
    DECLARE @consulta NVARCHAR(MAX);
    IF COL_LENGTH('dbo.usuarios', 'telefono') IS NOT NULL
      SET @consulta = N'
        SELECT
          id,
          alias,
          direccion_correo_electronico AS direccionCorreoElectronico,
          telefono,
          estatus
        FROM dbo.usuarios
        ORDER BY alias, id;';
    ELSE
      SET @consulta = N'
        SELECT
          id,
          alias,
          direccion_correo_electronico AS direccionCorreoElectronico,
          CAST(NULL AS VARCHAR(20)) AS telefono,
          estatus
        FROM dbo.usuarios
        ORDER BY alias, id;';
    EXEC sys.sp_executesql @consulta;
  `;
}

export async function buscarPorClave(clave: string): Promise<any | null> {
  const registros = await prisma.$queryRaw<any[]>`
      SELECT
        pu.id AS idPreUsuario,
        u.alias,
        u.direccion_correo_electronico AS direccionCorreoElectronico,
        u.telefono
      FROM pre_usuarios pu
      LEFT JOIN usuarios u
        ON u.id_pre_usuario = pu.id
      WHERE pu.clave = TRY_CONVERT(uniqueidentifier, ${clave});
    `;

  if (registros.length === 0) {
    throw new Error('La clave del pre usuario no existe.');
  }

  const registro = registros[0];

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
  const registros = await prisma.$queryRaw<any[]>`
      SELECT
        pu.id AS idPreUsuario,
        u.id AS idUsuario
      FROM pre_usuarios pu
      LEFT JOIN usuarios u
        ON u.id_pre_usuario = pu.id
      WHERE pu.clave = TRY_CONVERT(uniqueidentifier, ${clave});
    `;

  if (registros.length === 0) {
    throw new Error('La clave del pre usuario no existe.');
  }

  const registro = registros[0];

  if (registro.idUsuario) {
    throw new Error('La clave del pre usuario ya está siendo utilizada.');
  }

  return registro.idPreUsuario;
}

export async function crearUsuario(
  datos: DatosCrearUsuario
): Promise<void> {

  const sesion = obtenerSesion();

  const usuario = await ejecutarConSesion(sesion?.idUsuario ?? 0, async (tx) => {
    return tx.usuarios.create({
      data: {
        alias: datos.alias,
        direccion_correo_electronico: datos.direccionCorreoElectronico,
        contrasena: datos.contrasena,
        id_pre_usuario: datos.idPreUsuario,
        telefono: datos.telefono,
        estatus: true
      }
    });
  });

  crearEvento(
    'Creó el registro de Usuario',
    usuario
  );
}

export async function buscarPorIdentificador(identificador: string): Promise<Usuario> {
  const registros = await prisma.$queryRaw<Usuario[]>`
    SELECT * FROM usuarios
    WHERE alias = ${identificador}
       OR direccion_correo_electronico = ${identificador}
       OR telefono = ${identificador}
  `;

  const usuario = registros[0];

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

  const registros = await prisma.$queryRaw<Usuario[]>`
      SELECT *
      FROM usuarios
      WHERE alias = ${identificador}
         OR direccion_correo_electronico = ${identificador}
         OR telefono = ${identificador}
    `;

  return registros[0] ?? null;
}

export async function actualizarContrasena(idUsuario: number, hashContrasena: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id: idUsuario },
    data: { contrasena: hashContrasena }
  });
}

export async function actualizarEstatus(idUsuario: number, estatus: boolean): Promise<void> {
  await prisma.usuarios.update({
    where: { id: idUsuario },
    data: { estatus }
  });
}

export async function actualizar(datos: DatosActualizarUsuario): Promise<void> {

  const sesion = obtenerSesion();

  const usuario = await ejecutarConSesion(sesion?.idUsuario ?? 0, async (tx) => {
    return tx.usuarios.update({
      where: { id: datos.idUsuario },
      data: {
        alias: datos.alias,
        direccion_correo_electronico: datos.direccionCorreoElectronico,
        telefono: datos.telefono
      }
    });
  });

  crearEvento(
    'Actualizó el registro de Usuario',
    usuario
  );
}
