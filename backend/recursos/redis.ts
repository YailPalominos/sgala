import Redis from 'ioredis';
import { entorno } from './entorno';

/**
 * Instancia de Redis (ioredis) configurada desde las variables de entorno.
 * Se reutiliza en toda la aplicación para sesiones, estado de dispositivos y llaves de recuperación.
 */
const redis = new Redis({
  host: entorno.REDIS_SERVIDOR,
  port: entorno.REDIS_PUERTO,
  password: entorno.REDIS_CONTRASENA,
  username: entorno.REDIS_USUARIO,
  lazyConnect: true,
});

export { redis };
