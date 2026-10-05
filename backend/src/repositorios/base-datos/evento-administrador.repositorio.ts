import { prisma } from '../../recursos/prisma';

export interface EventoAdministrador {
  id: number;
  fecha: Date;
  accion: string;
  aliasAdministrador: string;
  correoAdministrador: string;
}

export async function registrar(
  idAdministrador: number,
  accion: string
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO dbo.eventos_administradores (id_administrador, accion)
    VALUES (${idAdministrador}, ${accion})
  `;
}

export async function obtenerLista(): Promise<EventoAdministrador[]> {
  return prisma.$queryRaw<EventoAdministrador[]>`
    SELECT
      e.id,
      e.fecha,
      e.accion,
      a.alias AS aliasAdministrador,
      a.direccion_correo_electronico AS correoAdministrador
    FROM dbo.eventos_administradores e
    INNER JOIN dbo.administradores a ON a.id = e.id_administrador
    ORDER BY e.fecha DESC, e.id DESC
  `;
}
