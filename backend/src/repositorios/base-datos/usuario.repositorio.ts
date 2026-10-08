import { ErrorHttp } from '@/interceptores/error.middleware';
import { prisma } from '../../recursos/prisma';
import { crearEvento } from '@/recursos/evento';
import { Usuario } from '@prisma/client';
import { obtenerPreUsuarioPorIdentificador } from '../redis/pre-usuarios.redis';

export async function obtenerListaAdministrativa(): Promise<any[]> {
  return prisma.$queryRaw<any[][]>`
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

export async function crearUsuario(datos: any): Promise<void> {
  const usuario = await prisma.usuario.create({
    data: {
      clave: crypto.randomUUID(),
      alias: datos.alias,
      direccionCorreoElectronico: datos.direccionCorreoElectronico,
      contrasena: datos.contrasena,
      telefono: datos.telefono,
      estatus: true
    }
  });
  crearEvento('Creó el registro de Usuario', usuario);
}

export async function buscarPorIdentificador(identificador: string): Promise<Usuario> {
  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { alias: identificador },
        { direccionCorreoElectronico: identificador },
        { telefono: identificador }
      ]
    }
  });


  if (!usuario) {
    throw new Error('Usuario no encontrado.');
  }

  if (usuario.estatus != true) {
    throw new Error('Usuario inactivo contacte al administrador.');
  }

  return usuario;
}

export async function obtenerUsuarioPorId(id: number): Promise<Usuario> {
  const usuario = await prisma.usuario.findUnique({
    where: { id }
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado.');
  }

  if (!usuario.estatus) {
    throw new Error('Usuario inactivo, contacte al administrador.');
  }

  return usuario;
}

/**
 * Busca si ya existe un usuario con el alias, correo o teléfono indicado.
 */
export async function buscarExistentePorIdentificador(
  identificador: string
): Promise<Usuario | null> {
  return prisma.usuario.findFirst({
    where: {
      OR: [
        { alias: identificador },
        { direccionCorreoElectronico: identificador },
        { telefono: identificador }
      ]
    }
  });
}

export async function actualizarContrasena(idUsuario: number, hashContrasena: string): Promise<void> {
  await prisma.usuario.update({
    where: { id: idUsuario },
    data: { contrasena: hashContrasena }
  });
}

export async function actualizarEstatus(idUsuario: number, estatus: boolean): Promise<void> {
  await prisma.usuario.update({
    where: { id: idUsuario },
    data: { estatus }
  });
}

/**
 * Valida que el alias, correo y teléfono no estén registrados
 */
export async function validarNoDuplicadoActualizacion(
  idUsuario: number,
  alias: string,
  direccionCorreoElectronico: string,
  telefono: string
): Promise<void> {
  const comprobaciones: Array<[string, string]> = [
    [alias, 'El alias ya está registrado. Intente con otro.'],
    [direccionCorreoElectronico,'La dirección de correo electrónico ya está registrada.' ],
    [telefono, 'El número de teléfono ya está registrado.']
  ];

  for (const [valor, mensaje] of comprobaciones) {
    if (!valor) continue;

    let enBaseDatos = await buscarExistentePorIdentificador(valor);

    // Permite el registro si pertenece al mismo usuario.
    if (enBaseDatos && enBaseDatos.id !== idUsuario) {
      throw new ErrorHttp(409, mensaje);
    } else {
      enBaseDatos = null
    }

    const enRedis = await obtenerPreUsuarioPorIdentificador(valor);

    if (enBaseDatos || enRedis) {
      throw new ErrorHttp(409, mensaje);
    }
  }
}


export async function actualizar(datos: any): Promise<void> {
  const usuarioActual = await prisma.usuario.findUnique({
    where: {
      clave: datos.clave
    }
  });

  if (!usuarioActual) {
    throw new ErrorHttp(404, 'El usuario no existe.');
  }

  await validarNoDuplicadoActualizacion(
    usuarioActual.id,
    datos.alias ?? usuarioActual.alias,
    datos.direccionCorreoElectronico ??
    usuarioActual.direccionCorreoElectronico,
    datos.telefono ?? usuarioActual.telefono
  );

  const usuario = await prisma.usuario.update({
    where: {
      clave: datos.clave
    },
    data: {
      ...(datos.alias !== undefined && {
        alias: datos.alias
      }),
      ...(datos.direccionCorreoElectronico !== undefined && {
        direccionCorreoElectronico: datos.direccionCorreoElectronico
      }),
      ...(datos.telefono !== undefined && {
        telefono: datos.telefono
      })
    }
  });

  crearEvento(
    'Actualizó el registro de Usuario',
    usuario
  );
}