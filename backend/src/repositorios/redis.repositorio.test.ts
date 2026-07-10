import {
  redisRepositorio,
  SesionRedis,
  EstadoDispositivoRedis,
} from './redis.repositorio';

const {
  guardarSesion,
  obtenerSesion,
  eliminarSesion,
  guardarLlaveRecuperacion,
  obtenerLlaveRecuperacion,
  eliminarLlaveRecuperacion,
  guardarEstadoDispositivo,
  obtenerEstadoDispositivo,
} = redisRepositorio;

// Mock de ioredis
const mockSet = jest.fn().mockResolvedValue('OK');
const mockGet = jest.fn().mockResolvedValue(null);
const mockDel = jest.fn().mockResolvedValue(1);

jest.mock('../configuracion/redis', () => ({
  redis: {
    set: (...args: unknown[]) => mockSet(...args),
    get: (...args: unknown[]) => mockGet(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

describe('Redis Repositorio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('guardarSesion', () => {
    it('debe guardar sesión con clave correcta y TTL', async () => {
      const datos: SesionRedis = { idUsuario: 1, alias: 'usuario1' };
      await guardarSesion('abc123', datos, 86400);

      expect(mockSet).toHaveBeenCalledWith(
        'sesion:abc123',
        JSON.stringify(datos),
        'EX',
        86400
      );
    });

    it('debe usar TTL por defecto de 86400 si no se especifica', async () => {
      const datos: SesionRedis = { idUsuario: 2, alias: 'usuario2' };
      await guardarSesion('xyz789', datos);

      expect(mockSet).toHaveBeenCalledWith(
        'sesion:xyz789',
        JSON.stringify(datos),
        'EX',
        86400
      );
    });
  });

  describe('obtenerSesion', () => {
    it('debe retornar datos de sesión si existe', async () => {
      const datos: SesionRedis = { idUsuario: 1, alias: 'usuario1' };
      mockGet.mockResolvedValueOnce(JSON.stringify(datos));

      const resultado = await obtenerSesion('abc123');

      expect(mockGet).toHaveBeenCalledWith('sesion:abc123');
      expect(resultado).toEqual(datos);
    });

    it('debe retornar null si la sesión no existe', async () => {
      mockGet.mockResolvedValueOnce(null);

      const resultado = await obtenerSesion('noexiste');

      expect(resultado).toBeNull();
    });
  });

  describe('eliminarSesion', () => {
    it('debe eliminar la clave de sesión', async () => {
      await eliminarSesion('abc123');

      expect(mockDel).toHaveBeenCalledWith('sesion:abc123');
    });
  });

  describe('guardarLlaveRecuperacion', () => {
    it('debe guardar llave con clave correcta y TTL', async () => {
      await guardarLlaveRecuperacion('llave-uuid', 5, 180);

      expect(mockSet).toHaveBeenCalledWith(
        'recuperacion:llave-uuid',
        JSON.stringify({ idUsuario: 5 }),
        'EX',
        180
      );
    });

    it('debe usar TTL por defecto de 180 si no se especifica', async () => {
      await guardarLlaveRecuperacion('otra-llave', 10);

      expect(mockSet).toHaveBeenCalledWith(
        'recuperacion:otra-llave',
        JSON.stringify({ idUsuario: 10 }),
        'EX',
        180
      );
    });
  });

  describe('obtenerLlaveRecuperacion', () => {
    it('debe retornar datos si la llave existe', async () => {
      mockGet.mockResolvedValueOnce(JSON.stringify({ idUsuario: 5 }));

      const resultado = await obtenerLlaveRecuperacion('llave-uuid');

      expect(mockGet).toHaveBeenCalledWith('recuperacion:llave-uuid');
      expect(resultado).toEqual({ idUsuario: 5 });
    });

    it('debe retornar null si la llave no existe o expiró', async () => {
      mockGet.mockResolvedValueOnce(null);

      const resultado = await obtenerLlaveRecuperacion('expirada');

      expect(resultado).toBeNull();
    });
  });

  describe('eliminarLlaveRecuperacion', () => {
    it('debe eliminar la clave de recuperación', async () => {
      await eliminarLlaveRecuperacion('llave-uuid');

      expect(mockDel).toHaveBeenCalledWith('recuperacion:llave-uuid');
    });
  });

  describe('guardarEstadoDispositivo', () => {
    it('debe guardar estado de dispositivo sin TTL', async () => {
      const estado: EstadoDispositivoRedis = {
        estadoConexion: 'conectado',
        localizacion: { latitud: 19.4326, longitud: -99.1332, altitud: 2240 },
        estado: '',
        alarma: '',
        estadoDirecto: '',
      };

      await guardarEstadoDispositivo('device-uuid-1', estado);

      expect(mockSet).toHaveBeenCalledWith(
        'dispositivo:device-uuid-1',
        JSON.stringify(estado)
      );
    });

    it('debe guardar estado con localización null', async () => {
      const estado: EstadoDispositivoRedis = {
        estadoConexion: 'desconectado',
        localizacion: null,
        estado: '',
        alarma: '',
        estadoDirecto: '',
      };

      await guardarEstadoDispositivo('device-uuid-2', estado);

      expect(mockSet).toHaveBeenCalledWith(
        'dispositivo:device-uuid-2',
        JSON.stringify(estado)
      );
    });
  });

  describe('obtenerEstadoDispositivo', () => {
    it('debe retornar estado si existe', async () => {
      const estado: EstadoDispositivoRedis = {
        estadoConexion: 'conectado',
        localizacion: { latitud: 19.4326, longitud: -99.1332, altitud: 2240 },
        estado: 'activo',
        alarma: '',
        estadoDirecto: '',
      };
      mockGet.mockResolvedValueOnce(JSON.stringify(estado));

      const resultado = await obtenerEstadoDispositivo('device-uuid-1');

      expect(mockGet).toHaveBeenCalledWith('dispositivo:device-uuid-1');
      expect(resultado).toEqual(estado);
    });

    it('debe retornar null si no existe', async () => {
      mockGet.mockResolvedValueOnce(null);

      const resultado = await obtenerEstadoDispositivo('no-existe');

      expect(resultado).toBeNull();
    });
  });
});
