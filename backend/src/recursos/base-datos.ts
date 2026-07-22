import sql from "mssql";
import { entorno } from "./entorno";

function aCamello(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function transformarRecordset(recordset: any[]) {
  if (!Array.isArray(recordset)) return recordset;

  return recordset.map(row => {
    const obj: any = {};

    for (const key of Object.keys(row)) {
      obj[aCamello(key)] = row[key];
    }

    return obj;
  });
}

function transformarResultado(resultado: any) {

  if (!resultado) return resultado;

  if (Array.isArray(resultado.recordset)) {
    resultado.recordset = transformarRecordset(resultado.recordset);
  }

  if (Array.isArray(resultado.recordsets)) {
    resultado.recordsets = resultado.recordsets.map(transformarRecordset);
  }

  return resultado;
}

const configuracion: sql.config = {
  server: entorno.SQL_SERVIDOR,
  user: entorno.SQL_USUARIO,
  password: entorno.SQL_CONTRASENA,
  database: entorno.SQL_BASE_DATOS,
  port: entorno.SQL_PUERTO,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let _pool: sql.ConnectionPool;
let inicializando: Promise<void> | null = null;

export async function iniciar() {

  if (_pool) return;

  if (inicializando) return inicializando;

  inicializando = (async () => {

    _pool = new sql.ConnectionPool(configuracion);

    await _pool.connect();

    console.log('🗄️  SQL Server conectado');

    inicializando = null;

  })();

  return inicializando;
}

export const pool = new Proxy({} as sql.ConnectionPool, {

  get(_, prop) {


    // =====================================
    // Caso especial: pool.request()
    // =====================================
    if (prop === "request") {

      return () => {

        if (!_pool) {
          throw new Error(
            "SQL Server no inicializado. Ejecuta iniciar() primero"
          );
        }

        return crearProxyRequest(
          _pool.request()
        );
      };
    }

    // =====================================
    // Otros métodos del ConnectionPool
    // connect(), close(), transaction(), etc.
    // =====================================
    return (...args: any[]) => {

      if (!_pool) {
        throw new Error(
          "SQL Server no inicializado. Ejecuta iniciar() primero"
        );
      }


      const metodo = (_pool as any)[prop];


      if (typeof metodo !== "function") {
        return metodo;
      }


      return metodo.apply(
        _pool,
        args
      );
    };
  }

});

function crearProxyRequest(request: sql.Request) {

    let proxy: any;

    proxy = new Proxy(request, {

        get(target, prop) {

            const original = (target as any)[prop];


            if (typeof original !== "function") {
                return original;
            }


            // Interceptar solamente ejecución SQL
            if (
                prop === "query" ||
                prop === "batch" ||
                prop === "execute"
            ) {

                return async (...args: any[]) => {

                    const resultado = await original.apply(
                        target,
                        args
                    );


                    return transformarResultado(resultado);
                };
            }


            // Mantener cadena:
            // request.input().input().query()
            return (...args: any[]) => {

                const resultado = original.apply(
                    target,
                    args
                );


                if (resultado === target) {
                    return proxy;
                }


                return resultado;
            };
        }

    });


    return proxy;
}