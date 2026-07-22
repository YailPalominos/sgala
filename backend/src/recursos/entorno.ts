/**
 * Módulo de configuración de entorno.
 * Carga variables de entorno con valores por defecto sensatos para desarrollo local.
 */

/** Interfaz que define todas las variables de configuración del sistema SGALA */
export interface Entorno {
  PRODUCCION: boolean;
  PUERTO_MQTT: number;
  PUERTO_SOCKET: number;
  SQL_SERVIDOR: string;
  SQL_USUARIO: string;
  SQL_CONTRASENA: string;
  SQL_BASE_DATOS: string;
  SQL_PUERTO: number;
  REDIS_USUARIO: string;
  REDIS_SERVIDOR: string;
  REDIS_CONTRASENA: string;
  REDIS_PUERTO: number;
  RUTA_CERTIFICADOS: string;
  SMTP_HOST: string;
  SMTP_PUERTO: number;
  SMTP_USUARIO: string;
  SMTP_CONTRASENA: string;
}

/**
 * Carga las variables de entorno desde process.env y aplica valores por defecto.
 * Cada propiedad se toma de la variable de entorno correspondiente (prefijo SGALA_)
 * o se usa el valor por defecto indicado.
 */
function cargarEntorno(): Entorno {
  return {
    PRODUCCION: process.env.SGALA_PRODUCCION === 'true',
    PUERTO_MQTT: parseInt(process.env.SGALA_PUERTO_MQTT || '4060', 10),
    PUERTO_SOCKET: parseInt(process.env.SGALA_PUERTO_SOCKET || '4061', 10),
    SQL_SERVIDOR: process.env.SGALA_SQL_SERVIDOR || 'localhost',
    SQL_USUARIO: process.env.SGALA_SQL_USUARIO || 'sa',
    SQL_CONTRASENA: process.env.SGALA_SQL_CONTRASENA || 'Sgala2024!',
    SQL_BASE_DATOS: process.env.SGALA_SQL_BASE_DATOS || 'sgala',
    SQL_PUERTO: parseInt(process.env.SGALA_SQL_PUERTO || '1433', 10),
    REDIS_USUARIO: process.env.SGALA_REDIS_USUARIO || 'default',
    REDIS_SERVIDOR: process.env.SGALA_REDIS_SERVIDOR || 'localhost',
    REDIS_CONTRASENA: process.env.SGALA_REDIS_CONTRASENA || '',
    REDIS_PUERTO: parseInt(process.env.SGALA_REDIS_PUERTO || '6379', 10),
    RUTA_CERTIFICADOS: process.env.SGALA_RUTA_CERTIFICADOS || 'C:\\certificados',
    SMTP_HOST: process.env.SGALA_SMTP_HOST || '',
    SMTP_PUERTO: parseInt(process.env.SGALA_SMTP_PUERTO || '500', 10),
    SMTP_USUARIO: process.env.SGALA_SMTP_USUARIO || '',
    SMTP_CONTRASENA: process.env.SGALA_SMTP_CONTRASENA || '',
  };
}

/** Instancia singleton de la configuración del entorno */
export const entorno: Entorno = cargarEntorno();
