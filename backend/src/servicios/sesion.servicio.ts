import { v4 as uuidv4 } from 'uuid';
import { redisRepositorio, SesionRedis } from '../repositorios/redis.repositorio';

/**
 * Servicio de gestión de sesiones.
 * Encapsula la lógica de creación, verificación y eliminación de sesiones en Redis.
 */
export const sesionServicio = {

  /**
   * Crea una nueva sesión para un usuario.
   * @param direccionCorreoElectronico - Dirección de correo electrónico del usuario
   * @param alias - Alias del usuario
   * @param idUsuario - Id del usuario
   * @returns El sessionId generado
   */
  async crearSesion(direccionCorreoElectronico: string, alias: string, idUsuario: number, telefono: string): Promise<SesionRedis> {
    const clave = uuidv4();
    const datos: SesionRedis = { clave, direccionCorreoElectronico, alias, idUsuario, telefono };
    await redisRepositorio.guardarSesion(clave, datos, 86400);
    return datos;
  },

  /**
   * Verifica una sesión existente en Redis.
   * @param sessionId - Identificador de la sesión a verificar
   * @returns Datos de la sesión (idUsuario, alias) o null si no existe/expiró
   */
  async obtenerSesion(sessionId: string): Promise<SesionRedis> {
    return redisRepositorio.obtenerSesion(sessionId);
  },

  /**
   * Elimina una sesión de Redis.
   * @param sessionId - Identificador de la sesión a eliminar
   */
  async eliminarSesion(sessionId: string): Promise<void> {
    await redisRepositorio.eliminarSesion(sessionId);
  },

  /**
  * Actualiza el id del socker de la sesión
  * @param claveSesion - Clave de la sesión
  * @param idSocket - Id del socket
  * 
  */
  async actualizarIdSocket(claveSesion: string, idSocket: string): Promise<void> {
    await redisRepositorio.actualizarIdSocket(claveSesion, idSocket);
  },

};
