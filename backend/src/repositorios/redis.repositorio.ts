import { redis } from '../configuracion/redis';

/**
 * Datos de sesión almacenados en Redis.
 * Clave: "sesion:{sessionId}" — TTL: 86400 segundos (1 día)
 */
export interface SesionRedis {
  idUsuario: number;
  alias: string;
}

/**
 * Datos de llave de recuperación almacenados en Redis.
 * Clave: "recuperacion:{llave}" — TTL: 180 segundos (3 minutos)
 */
export interface RecuperacionRedis {
  idUsuario: number;
}

/**
 * Estado de un dispositivo almacenado en Redis.
 * Clave: "dispositivo:{uuid}" — Sin TTL
 */
export interface EstadoDispositivoRedis {
  estadoConexion: 'conectado' | 'desconectado';
  localizacion: {
    latitud: number;
    longitud: number;
    altitud: number;
  } | null;
  estado: string;
  alarma: string;
  estadoDirecto: string;
}

// --- Prefijos de claves ---
const PREFIJO_SESION = 'sesion:';
const PREFIJO_RECUPERACION = 'recuperacion:';
const PREFIJO_DISPOSITIVO = 'dispositivo:';

/**
 * Repositorio de Redis para el sistema SGALA.
 * Encapsula las operaciones de sesiones, llaves de recuperación y estado de dispositivos.
 */
export const redisRepositorio = {
  // ========================
  // Sesiones
  // ========================

  /**
   * Guarda una sesión de usuario en Redis con TTL.
   * @param sessionId - Identificador único de la sesión
   * @param datos - Datos de la sesión (idUsuario, alias)
   * @param ttl - Tiempo de vida en segundos (por defecto 86400 = 1 día)
   */
  async guardarSesion(sessionId: string, datos: SesionRedis, ttl: number = 86400): Promise<void> {
    const clave = `${PREFIJO_SESION}${sessionId}`;
    await redis.set(clave, JSON.stringify(datos), 'EX', ttl);
  },

  /**
   * Obtiene los datos de una sesión desde Redis.
   * @param sessionId - Identificador de la sesión
   * @returns Datos de la sesión o null si no existe/expiró
   */
  async obtenerSesion(sessionId: string): Promise<SesionRedis | null> {
    const clave = `${PREFIJO_SESION}${sessionId}`;
    const datos = await redis.get(clave);
    if (!datos) return null;
    return JSON.parse(datos) as SesionRedis;
  },

  /**
   * Elimina una sesión de Redis.
   * @param sessionId - Identificador de la sesión a eliminar
   */
  async eliminarSesion(sessionId: string): Promise<void> {
    const clave = `${PREFIJO_SESION}${sessionId}`;
    await redis.del(clave);
  },

  // ========================
  // Llaves de recuperación
  // ========================

  /**
   * Guarda una llave de recuperación de contraseña en Redis con TTL.
   * @param llave - Llave UUID de recuperación
   * @param idUsuario - Identificador del usuario asociado
   * @param ttl - Tiempo de vida en segundos (por defecto 180 = 3 minutos)
   */
  async guardarLlaveRecuperacion(llave: string, idUsuario: number, ttl: number = 180): Promise<void> {
    const clave = `${PREFIJO_RECUPERACION}${llave}`;
    const datos: RecuperacionRedis = { idUsuario };
    await redis.set(clave, JSON.stringify(datos), 'EX', ttl);
  },

  /**
   * Obtiene los datos de una llave de recuperación desde Redis.
   * @param llave - Llave UUID de recuperación
   * @returns Datos de recuperación o null si no existe/expiró
   */
  async obtenerLlaveRecuperacion(llave: string): Promise<RecuperacionRedis | null> {
    const clave = `${PREFIJO_RECUPERACION}${llave}`;
    const datos = await redis.get(clave);
    if (!datos) return null;
    return JSON.parse(datos) as RecuperacionRedis;
  },

  /**
   * Elimina una llave de recuperación de Redis.
   * @param llave - Llave UUID de recuperación a eliminar
   */
  async eliminarLlaveRecuperacion(llave: string): Promise<void> {
    const clave = `${PREFIJO_RECUPERACION}${llave}`;
    await redis.del(clave);
  },

  // ========================
  // Estado de dispositivos
  // ========================

  /**
   * Guarda o actualiza el estado completo de un dispositivo en Redis (sin TTL).
   * @param uuid - UUID del dispositivo
   * @param estado - Estado completo del dispositivo
   */
  async guardarEstadoDispositivo(uuid: string, estado: EstadoDispositivoRedis): Promise<void> {
    const clave = `${PREFIJO_DISPOSITIVO}${uuid}`;
    await redis.set(clave, JSON.stringify(estado));
  },

  /**
   * Obtiene el estado de un dispositivo desde Redis.
   * @param uuid - UUID del dispositivo
   * @returns Estado del dispositivo o null si no existe
   */
  async obtenerEstadoDispositivo(uuid: string): Promise<EstadoDispositivoRedis | null> {
    const clave = `${PREFIJO_DISPOSITIVO}${uuid}`;
    const datos = await redis.get(clave);
    if (!datos) return null;
    return JSON.parse(datos) as EstadoDispositivoRedis;
  },
};
