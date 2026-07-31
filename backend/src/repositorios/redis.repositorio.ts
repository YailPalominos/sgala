
import { redis } from '../recursos/redis';
import { DatosActualizar } from './dispositivo.repositorio';
import { v4 as uuidv4 } from 'uuid';

/**
 * Datos de sesión almacenados en Redis.
 * Clave: "sesion:{sessionId}" — TTL: 86400 segundos (1 día)
 */
export interface SesionRedis {
  clave: string;
  idUsuario: number;
  alias: string;
  direccionCorreoElectronico: string;
  telefono: string,
  idSocket?: string;
}


interface PrecioSuscripcion {
  tipo: string;
  nombre: string;
  LOC: number;
  ALA: number;
  COC: number;
}

/**
 * Datos de llave de recuperación almacenados en Redis.
 * Clave: "recuperacion:{llave}" — TTL: 180 segundos (3 minutos)
 */
export interface RecuperacionRedis {
  clave: string;
  idUsuario: number;
}

/**
 * Estado de un dispositivo almacenado en Redis.
 * Clave: "dispositivo:{uuid}" — Sin TTL
 */
export interface EstadoDispositivoRedis {
  clave: string;
  idUsuario: number;
  alias: string;
  cualidades: string;
  telefono: string;
  estatusConexion?: boolean
  localizacion?: {
    latitud: number;
    longitud: number;
    altitud: number;
  };
  estatusCortaCorriente?: boolean;//Inidica si esta activo el corta corriente si lo esta inpide el flujo de corriente al motor
  estatusAlarma?: boolean;// Indica si esta activa la alarma
  fechaFinalSuscripcion?: string;//Indica la fecha de finalizacion de la suscripcion del dispositivo
  porcentajeBateria?: number,
  estado?: string;// 'E' estacionada 'M' en movimiento 'P' Prendida
}

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
   * @param clave - Identificador único de la sesión
   * @param datos - Datos de la sesión (idUsuario, alias)
   * @param ttl - Tiempo de vida en segundos (por defecto 86400 = 1 día)
   */
  async guardarSesion(
    clave: string,
    datos: SesionRedis,
    ttl: number = 86400
  ): Promise<void> {

    await redis.hset(`sesiones:${clave}`, {
      clave: datos.clave,
      alias: datos.alias,
      direccionCorreoElectronico: datos.direccionCorreoElectronico,
      idSocket: datos.idSocket ?? 'null',
      idUsuario: datos.idUsuario,
      telefono: datos.telefono,
    });

    await redis.expire(
      `sesiones:${clave}`,
      ttl
    );

  },

  /**
   * Obtiene los datos de una sesión desde Redis.
   * @param clave - Identificador de la sesión
   * @returns Datos de la sesión o null si no existe/expiró
   */
  async obtenerSesion(clave: string): Promise<SesionRedis> {

    const datos = await redis.hgetall(
      `sesiones:${clave}`
    );

    if (!datos || Object.keys(datos).length === 0) {
      throw new Error("Sesión expirada o eliminada.")
    }

    return {
      clave: datos.clave,
      idUsuario: parseInt(datos.idUsuario),
      alias: datos.alias,
      direccionCorreoElectronico: datos.direccionCorreoElectronico,
      telefono: datos.telefono,
      idSocket: datos.idSocket === 'null'
        ? undefined
        : datos.idSocket
    };
  },

  /**
 * Actualiza el socket asociado a una sesión.
 * @param clave - Identificador de la sesión
 * @param idSocket - Identificador del socket conectado
 */
  async actualizarIdSocket(
    clave: string,
    idSocket: string
  ): Promise<void> {

    await redis.hset(
      `sesiones:${clave}`,
      "idSocket",
      idSocket
    );
  },

  /**
 * Obtiene todos los Socket ID activos de un usuario.
 * @param idUsuario - Identificador del usuario.
 * @returns Lista de Socket ID.
 */
  async obtenerSocketsUsuario(
    idUsuario: number
  ): Promise<string[]> {

    const claves = await redis.keys('sesiones:*');

    const sockets: string[] = [];

    for (const clave of claves) {

      const sesion = await redis.hgetall(clave);

      if (
        Number(sesion.idUsuario) === idUsuario &&
        sesion.idSocket
      ) {
        sockets.push(sesion.idSocket);
      }

    }

    return sockets;

  },

  /**
   * Elimina una sesión de Redis.
   * @param clave - Identificador de la sesión a eliminar
   */
  async eliminarSesion(
    clave: string
  ): Promise<void> {

    await redis.del(
      `sesiones:${clave}`
    );
  },

  /**
  * Crea una llave de recuperación con una vigencia de 2 minutos.
  * @param idUsuario - Identificador del usuario asociado.
  * @returns Llave generada.
  */
  async crearLlaveRecuperacion(idUsuario: number, tipo: string): Promise<string> {
    const llave = uuidv4();

    await redis.hset(`llaves:${llave}`, {
      clave: llave,
      tipo,
      idUsuario: String(idUsuario)
    });

    await redis.expire(`llaves:${llave}`, 120);

    return llave;
  },

  /**
   * Obtiene los datos de una llave de recuperación desde Redis.
   * @param llave - Llave UUID de recuperación.
   * @returns Datos de la llave o null si no existe o expiró.
   */
  async obtenerLlaveRecuperacion(
    llave: string
  ): Promise<RecuperacionRedis | null> {
    const datos = await redis.hgetall(`llaves:${llave}`);

    if (Object.keys(datos).length === 0) {
      return null;
    }

    return {
      clave: datos.clave,
      idUsuario: Number(datos.idUsuario)
    };
  },

  /**
   * Elimina una llave de recuperación de Redis.
   * @param llave - Llave UUID de recuperación.
   */
  async eliminarLlaveRecuperacion(
    llave: string
  ): Promise<void> {
    await redis.del(`llaves:${llave}`);
  },

  /**
   * Reemplaza el estado de todos los dispositivos en Redis.
   * Elimina los estados anteriores y guarda los nuevos.
   * Los valores undefined se almacenan como null.
   * @param dispositivos - Lista de estados de dispositivos
   */
  async guardarEstadosDispositivos(
    dispositivos: EstadoDispositivoRedis[]
  ): Promise<void> {

    // Eliminar todos los dispositivos anteriores
    const claves = await redis.keys('dispositivos:*');

    if (claves.length > 0) {
      await redis.del(...claves);
    }

    // Guardar los nuevos estados
    for (const dispositivo of dispositivos) {
      await redis.hset(`dispositivos:${dispositivo.clave}`, {
        clave: dispositivo.clave,
        idUsuario: String(dispositivo.idUsuario),
        alias: String(dispositivo.alias),
        cualidades: String(dispositivo.cualidades),
        telefono: String(dispositivo.telefono),
        estatusConexion: String(dispositivo.estatusConexion ?? null),
        localizacion: JSON.stringify(dispositivo.localizacion ?? null),
        estatusAlarma: dispositivo.estatusAlarma ?? 'null',
        estatusCortaCorriente: dispositivo.estatusCortaCorriente ?? 'null',
        fechaFinalSuscripcion: dispositivo.fechaFinalSuscripcion ?? 'null',
        porcentajeBateria: dispositivo.porcentajeBateria ?? 'null',
        estado: dispositivo.estado ?? 'null',
      });
    }
  },

  /**
 * Obtiene el estado completo de un dispositivo desde Redis.
 * Hash: dispositivos
 * Campo: clave del dispositivo
 * @param clave - UUID del dispositivo
 * @returns Estado del dispositivo o null si no existe
 */
  async obtenerDispositivo(clave: string): Promise<EstadoDispositivoRedis> {

    const datos = await redis.hgetall(`dispositivos:${clave}`);

    if (Object.keys(datos).length === 0) {
      throw new Error("Dispositivo no encontrado")
    }

    return {
      clave: datos.clave,
      idUsuario: Number(datos.idUsuario),
      alias: datos.alias,
      cualidades: datos.cualidades,
      telefono: datos.telefono,
      estatusConexion: datos.estatusConexion === 'true',

      localizacion: datos.localizacion
        ? JSON.parse(datos.localizacion)
        : undefined,

      estatusAlarma: datos.estatusAlarma === 'true',

      estatusCortaCorriente: datos.estatusCortaCorriente === 'true',

      fechaFinalSuscripcion:
        datos.fechaFinalSuscripcion !== 'null'
          ? datos.fechaFinalSuscripcion
          : undefined,

      porcentajeBateria:
        datos.porcentajeBateria !== 'null'
          ? Number(datos.porcentajeBateria)
          : undefined,

      estado:
        datos.estado !== 'null'
          ? datos.estado
          : undefined,
    };
  },

  /**
 * Obtiene todos los dispositivos asociados a un usuario desde Redis.
 * 
 * @param idUsuario - Identificador del usuario
 * @returns Lista de estados de dispositivos
 */
  async obtenerDispositivosUsuario(
    idUsuario: number
  ): Promise<EstadoDispositivoRedis[]> {

    const claves = await redis.keys('dispositivos:*');

    if (claves.length === 0) {
      return [];
    }

    const dispositivos: EstadoDispositivoRedis[] = [];

    for (const claveRedis of claves) {

      const datos = await redis.hgetall(claveRedis);

      if (
        datos.idUsuario &&
        Number(datos.idUsuario) === idUsuario
      ) {

        dispositivos.push({
          clave: datos.clave,
          alias: datos.alias,
          telefono: datos.telefono,
          cualidades: datos.cualidades,
          idUsuario: Number(datos.idUsuario),
          estatusConexion: datos.estatusConexion === 'true',
          localizacion: datos.localizacion
            ? JSON.parse(datos.localizacion)
            : undefined,
          estatusAlarma: datos.estatusAlarma === 'true',
          estatusCortaCorriente: datos.estatusCortaCorriente === 'true',
          fechaFinalSuscripcion: datos.fechaFinalSuscripcion || undefined,
          porcentajeBateria: Number(datos.porcentajeBateria) ?? 'null',
          estado: datos.estado ?? 'null',
        });

      }
    }


    return dispositivos;
  },

  /**
   * Actualiza únicamente el estado de conexión de un dispositivo.
   * @param clave - UUID del dispositivo
   * @param estatusConexion - Estado de conexión
   */
  async actualizarEstatusConexion(
    clave: string,
    estatusConexion: boolean
  ): Promise<void> {
    clave = clave.toUpperCase();
    await redis.hset(
      `dispositivos:${clave}`,
      'estatusConexion',
      String(estatusConexion)
    );
  },

  /**
   * Actualiza únicamente los datos enviados de un dispositivo.
   * @param claveDispositivo - Clave del dispositivo.
   * @param datos - Datos del dispositivo a actualizar.
   */
  async actualizarDatosDispositivo(
    claveDispositivo: string,
    datos: any
  ): Promise<void> {

    const actualizacion: Record<string, string> = {};

    const campos = [
      'alias',
      'telefono',
      'estatusAlarma',
      'estatusCortaCorriente',
      'fechaFinalSuscripcion',
      'porcentajeBateria',
      'estado',
      'localizacion'
    ];


    for (const campo of campos) {

      if (datos[campo] !== undefined) {

        let valor = datos[campo];

        if (campo === 'localizacion') {
          valor = JSON.stringify(valor);
        }

        actualizacion[campo] = String(valor);

      }

    }


    if (Object.keys(actualizacion).length === 0) {
      return;
    }


    await redis.hset(
      `dispositivos:${claveDispositivo}`,
      actualizacion
    );

  },
  /**
   * Actualiza únicamente la fecha final de suscripción de un dispositivo.
   * @param clave - UUID del dispositivo
   * @param fechaFinalSuscripcion - Fecha final de la suscripción o null
   */
  async actualizarFechaFinalSuscripcion(
    clave: string,
    fechaFinalSuscripcion: Date | null
  ): Promise<void> {
    await redis.hset(
      `dispositivos:${clave}`,
      'fechaFinalSuscripcion',
      fechaFinalSuscripcion
        ? fechaFinalSuscripcion.toISOString()
        : ''
    );
  },

  /**
   * Actualiza los precios de las suscripciones.
   * Si ya existen, los reemplaza completamente.
   */
  async actualizarPrecios(precios: PrecioSuscripcion[]): Promise<void> {

    await redis.set(
      'precios',
      JSON.stringify(precios)
    );

  },

  /**
   * Obtiene los precios de las suscripciones.
   */
  async obtenerPrecios(): Promise<PrecioSuscripcion[]> {

    const datos = await redis.get('precios');

    if (!datos) {
      throw new Error("No se encontraron los precios del sistema.")
    }

    return JSON.parse(datos) as PrecioSuscripcion[];

  }
}