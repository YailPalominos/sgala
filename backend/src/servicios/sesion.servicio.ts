import { v4 as uuidv4 } from 'uuid';
import { redisRepositorio, SesionRedis } from '../repositorios/redis.repositorio';

/**
 * Servicio de gestión de sesiones.
 * Encapsula la lógica de creación, verificación y eliminación de sesiones en Redis.
 */
export const sesionServicio = {
  /**
   * Crea una nueva sesión para un usuario.
   * Genera un UUID como identificador de sesión y lo almacena en Redis con TTL de 86400s (1 día).
   * @param idUsuario - Identificador del usuario
   * @param alias - Alias del usuario
   * @returns El sessionId generado
   */
  async crearSesion(idUsuario: number, alias: string): Promise<string> {
    const sessionId = uuidv4();
    const datos: SesionRedis = { idUsuario, alias };
    await redisRepositorio.guardarSesion(sessionId, datos, 86400);
    return sessionId;
  },

  /**
   * Verifica una sesión existente en Redis.
   * @param sessionId - Identificador de la sesión a verificar
   * @returns Datos de la sesión (idUsuario, alias) o null si no existe/expiró
   */
  async verificarSesion(sessionId: string): Promise<SesionRedis | null> {
    return redisRepositorio.obtenerSesion(sessionId);
  },

  /**
   * Elimina una sesión de Redis.
   * @param sessionId - Identificador de la sesión a eliminar
   */
  async eliminarSesion(sessionId: string): Promise<void> {
    await redisRepositorio.eliminarSesion(sessionId);
  },
};
