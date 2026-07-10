import sql from 'mssql';
import { entorno } from './entorno';

/**
 * Configuración del pool de conexiones a SQL Server.
 * Usa las variables del módulo de entorno para conectarse a la base de datos "sgala".
 */
const configuracionSql: sql.config = {
  server: entorno.SQL_SERVIDOR,
  user: entorno.SQL_USUARIO,
  password: entorno.SQL_CONTRASENA,
  database: entorno.SQL_BASE_DATOS,
  port: entorno.SQL_PUERTO,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

/** Pool de conexiones reutilizable para toda la aplicación */
const pool = new sql.ConnectionPool(configuracionSql);

/** Promesa de conexión — se resuelve una sola vez al conectar */
const conexionPool = pool.connect();

export { pool, conexionPool };
