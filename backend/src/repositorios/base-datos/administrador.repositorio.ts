import { Prisma } from '@prisma/client';
import { prisma } from '../../recursos/prisma';

export interface Administrador {
  id: number;
  nombres: string;
  apellidos: string;
  direccionCorreoElectronico: string;
  estatus: boolean;
  alias: string;
  permisos: string | null;
}

export interface AdministradorConContrasena extends Administrador {
  contrasena: string;
}

export interface DatosCrearAdministrador {
  nombres: string;
  apellidos: string;
  direccionCorreoElectronico: string;
  contrasena: string;
  estatus: boolean;
  alias: string;
  permisos: string | null;
}

export interface DatosActualizarAdministrador extends DatosCrearAdministrador {
  id: number;
}

const columnasPublicas = `
  id,
  nombres,
  apellidos,
  direccion_correo_electronico AS "direccionCorreoElectronico",
  estatus,
  alias,
  permisos
`;

export async function obtenerLista(): Promise<Administrador[]> {
  return prisma.$queryRaw<Administrador[]>`
    SELECT ${Prisma.raw(columnasPublicas)}
    FROM dbo.administradores
    ORDER BY id
  `;
}

export async function obtener(id: number): Promise<Administrador | null> {
  const administradores = await prisma.$queryRaw<Administrador[]>`
    SELECT ${Prisma.raw(columnasPublicas)}
    FROM dbo.administradores
    WHERE id = ${id}
  `;
  return administradores[0] ?? null;
}

export async function obtenerConContrasena(
  id: number
): Promise<AdministradorConContrasena | null> {
  const administradores = await prisma.$queryRaw<AdministradorConContrasena[]>`
    SELECT
      id,
      nombres,
      apellidos,
      direccion_correo_electronico AS "direccionCorreoElectronico",
      contrasena,
      estatus,
      alias,
      permisos
    FROM dbo.administradores
    WHERE id = ${id}
  `;
  return administradores[0] ?? null;
}

export async function buscarPorIdentificador(
  identificador: string
): Promise<AdministradorConContrasena | null> {
  const administradores = await prisma.$queryRaw<AdministradorConContrasena[]>`
    SELECT
      id,
      nombres,
      apellidos,
      direccion_correo_electronico AS "direccionCorreoElectronico",
      contrasena,
      estatus,
      alias,
      permisos
    FROM dbo.administradores
    WHERE alias = ${identificador}
       OR direccion_correo_electronico = ${identificador}
  `;
  return administradores[0] ?? null;
}

export async function existeIdentificador(
  identificador: string,
  excluirId?: number
): Promise<boolean> {
  const coincidencias = await prisma.$queryRaw<{ existe: number }[]>`
    SELECT TOP 1 1 AS existe
    FROM dbo.administradores
    WHERE (alias = ${identificador}
       OR direccion_correo_electronico = ${identificador})
      AND (${excluirId ?? null} IS NULL OR id <> ${excluirId ?? null})
  `;
  return coincidencias.length > 0;
}

export async function crear(datos: DatosCrearAdministrador): Promise<number> {
  const resultado = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO dbo.administradores (
      nombres,
      apellidos,
      direccion_correo_electronico,
      contrasena,
      estatus,
      alias,
      permisos
    )
    OUTPUT INSERTED.id AS id
    VALUES (
      ${datos.nombres},
      ${datos.apellidos},
      ${datos.direccionCorreoElectronico},
      ${datos.contrasena},
      ${datos.estatus},
      ${datos.alias},
      ${datos.permisos}
    )
  `;
  return resultado[0].id;
}

export async function actualizar(datos: DatosActualizarAdministrador): Promise<boolean> {
  const resultado = await prisma.$executeRaw`
    UPDATE dbo.administradores
    SET
      nombres = ${datos.nombres},
      apellidos = ${datos.apellidos},
      direccion_correo_electronico = ${datos.direccionCorreoElectronico},
      contrasena = ${datos.contrasena},
      estatus = ${datos.estatus},
      alias = ${datos.alias},
      permisos = ${datos.permisos}
    WHERE id = ${datos.id}
  `;
  return resultado > 0;
}
