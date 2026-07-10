import fc from 'fast-check';

describe('Módulo de configuración de entorno', () => {
  const variablesOriginales = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...variablesOriginales };
  });

  afterAll(() => {
    process.env = variablesOriginales;
  });

  it('debe exportar la interfaz Entorno y la constante entorno', () => {
    const modulo = require('./entorno');
    expect(modulo.entorno).toBeDefined();
    expect(typeof modulo.entorno).toBe('object');
  });

  it('debe cargar valores por defecto cuando no hay variables de entorno', () => {
    // Limpiar todas las variables SGALA_
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('SGALA_')) delete process.env[key];
    });

    const { entorno } = require('./entorno');

    expect(entorno.PUERTO_MQTT).toBe(4060);
    expect(entorno.PUERTO_SOCKET).toBe(4061);
    expect(entorno.SQL_SERVIDOR).toBe('localhost');
    expect(entorno.SQL_USUARIO).toBe('sa');
    expect(entorno.SQL_CONTRASENA).toBe('');
    expect(entorno.SQL_BASE_DATOS).toBe('sgala');
    expect(entorno.SQL_PUERTO).toBe(3306);
    expect(entorno.REDIS_USUARIO).toBe('default');
    expect(entorno.REDIS_SERVIDOR).toBe('localhost');
    expect(entorno.REDIS_CONTRASENA).toBe('');
    expect(entorno.REDIS_PUERTO).toBe(6379);
    expect(entorno.RUTA_CERTIFICADOS).toBe('C:\\certificados');
    expect(entorno.SMTP_HOST).toBe('');
    expect(entorno.SMTP_PUERTO).toBe(587);
    expect(entorno.SMTP_USUARIO).toBe('');
    expect(entorno.SMTP_CONTRASENA).toBe('');
  });

  it('debe leer variables de entorno con prefijo SGALA_', () => {
    process.env.SGALA_PUERTO_MQTT = '5060';
    process.env.SGALA_PUERTO_SOCKET = '5061';
    process.env.SGALA_SQL_SERVIDOR = '192.168.1.100';
    process.env.SGALA_SQL_USUARIO = 'admin';
    process.env.SGALA_SQL_CONTRASENA = 'secreto123';
    process.env.SGALA_SQL_BASE_DATOS = 'sgala_prod';
    process.env.SGALA_SQL_PUERTO = '1433';
    process.env.SGALA_REDIS_USUARIO = 'redis_user';
    process.env.SGALA_REDIS_SERVIDOR = '10.0.0.5';
    process.env.SGALA_REDIS_CONTRASENA = 'redis_pass';
    process.env.SGALA_REDIS_PUERTO = '6380';
    process.env.SGALA_RUTA_CERTIFICADOS = 'D:\\certs';
    process.env.SGALA_SMTP_HOST = 'smtp.gmail.com';
    process.env.SGALA_SMTP_PUERTO = '465';
    process.env.SGALA_SMTP_USUARIO = 'correo@gmail.com';
    process.env.SGALA_SMTP_CONTRASENA = 'smtp_pass';

    const { entorno } = require('./entorno');

    expect(entorno.PUERTO_MQTT).toBe(5060);
    expect(entorno.PUERTO_SOCKET).toBe(5061);
    expect(entorno.SQL_SERVIDOR).toBe('192.168.1.100');
    expect(entorno.SQL_USUARIO).toBe('admin');
    expect(entorno.SQL_CONTRASENA).toBe('secreto123');
    expect(entorno.SQL_BASE_DATOS).toBe('sgala_prod');
    expect(entorno.SQL_PUERTO).toBe(1433);
    expect(entorno.REDIS_USUARIO).toBe('redis_user');
    expect(entorno.REDIS_SERVIDOR).toBe('10.0.0.5');
    expect(entorno.REDIS_CONTRASENA).toBe('redis_pass');
    expect(entorno.REDIS_PUERTO).toBe(6380);
    expect(entorno.RUTA_CERTIFICADOS).toBe('D:\\certs');
    expect(entorno.SMTP_HOST).toBe('smtp.gmail.com');
    expect(entorno.SMTP_PUERTO).toBe(465);
    expect(entorno.SMTP_USUARIO).toBe('correo@gmail.com');
    expect(entorno.SMTP_CONTRASENA).toBe('smtp_pass');
  });

  it('debe parsear puertos numéricos como enteros válidos (property-based)', () => {
    const fc = require('fast-check');

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 65535 }),
        fc.integer({ min: 1, max: 65535 }),
        fc.integer({ min: 1, max: 65535 }),
        fc.integer({ min: 1, max: 65535 }),
        fc.integer({ min: 1, max: 65535 }),
        (puertoMqtt: number, puertoSocket: number, puertoSql: number, puertoRedis: number, puertoSmtp: number) => {
          jest.resetModules();
          process.env.SGALA_PUERTO_MQTT = String(puertoMqtt);
          process.env.SGALA_PUERTO_SOCKET = String(puertoSocket);
          process.env.SGALA_SQL_PUERTO = String(puertoSql);
          process.env.SGALA_REDIS_PUERTO = String(puertoRedis);
          process.env.SGALA_SMTP_PUERTO = String(puertoSmtp);

          const { entorno } = require('./entorno');

          expect(entorno.PUERTO_MQTT).toBe(puertoMqtt);
          expect(entorno.PUERTO_SOCKET).toBe(puertoSocket);
          expect(entorno.SQL_PUERTO).toBe(puertoSql);
          expect(entorno.REDIS_PUERTO).toBe(puertoRedis);
          expect(entorno.SMTP_PUERTO).toBe(puertoSmtp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('debe retornar tipos correctos para todas las propiedades', () => {
    const { entorno } = require('./entorno');

    // Verificar tipos numéricos
    expect(typeof entorno.PUERTO_MQTT).toBe('number');
    expect(typeof entorno.PUERTO_SOCKET).toBe('number');
    expect(typeof entorno.SQL_PUERTO).toBe('number');
    expect(typeof entorno.REDIS_PUERTO).toBe('number');
    expect(typeof entorno.SMTP_PUERTO).toBe('number');

    // Verificar tipos string
    expect(typeof entorno.SQL_SERVIDOR).toBe('string');
    expect(typeof entorno.SQL_USUARIO).toBe('string');
    expect(typeof entorno.SQL_CONTRASENA).toBe('string');
    expect(typeof entorno.SQL_BASE_DATOS).toBe('string');
    expect(typeof entorno.REDIS_USUARIO).toBe('string');
    expect(typeof entorno.REDIS_SERVIDOR).toBe('string');
    expect(typeof entorno.REDIS_CONTRASENA).toBe('string');
    expect(typeof entorno.RUTA_CERTIFICADOS).toBe('string');
    expect(typeof entorno.SMTP_HOST).toBe('string');
    expect(typeof entorno.SMTP_USUARIO).toBe('string');
    expect(typeof entorno.SMTP_CONTRASENA).toBe('string');

    // Verificar que los puertos no son NaN
    expect(Number.isNaN(entorno.PUERTO_MQTT)).toBe(false);
    expect(Number.isNaN(entorno.PUERTO_SOCKET)).toBe(false);
    expect(Number.isNaN(entorno.SQL_PUERTO)).toBe(false);
    expect(Number.isNaN(entorno.REDIS_PUERTO)).toBe(false);
    expect(Number.isNaN(entorno.SMTP_PUERTO)).toBe(false);
  });
});
