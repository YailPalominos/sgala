import { PrismaClient } from '@prisma/client';

/**
 * Cliente de Prisma (singleton).
 *
 * Se reutiliza en toda la aplicación para el acceso a SQL Server.
 * La cadena de conexión se toma de DATABASE_URL (.env).
 */
export const prisma = new PrismaClient();

/**
 * Establece la conexión con la base de datos.
 * Prisma conecta de forma perezosa en la primera consulta,
 * pero llamar connect() al iniciar permite detectar errores temprano.
 */
export async function iniciarPrisma(): Promise<void> {
  await prisma.$connect();
  console.log('🗄️  Prisma conectado a SQL Server');
}

/**
 * Cierra la conexión de Prisma (útil al apagar la aplicación).
 */
export async function cerrarPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Ejecuta una operación dentro de una transacción fijando primero
 * el session_context 'idUsuario', que usan los triggers de auditoría
 * para registrar quién realizó el cambio.
 *
 * Equivalente al antiguo `poolSesion`: establece el contexto de sesión
 * antes de ejecutar las operaciones que disparan triggers.
 *
 * @param idUsuario id del usuario que realiza la operación (0 si no hay sesión)
 * @param operacion función que recibe el cliente transaccional
 */
export async function ejecutarConSesion<T>(
  idUsuario: number,
  operacion: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`EXEC sys.sp_set_session_context @key = N'idUsuario', @value = ${idUsuario};`;
    return operacion(tx);
  });
}
