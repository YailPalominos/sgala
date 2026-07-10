import { sesionServicio } from './sesion.servicio';
import { redisRepositorio, SesionRedis } from '../repositorios/redis.repositorio';

// Mock del repositorio de Redis
jest.mock('../repositorios/redis.repositorio', () => ({
  redisRepositorio: {
    guardarSesion: jest.fn().mockResolvedValue(undefined),
    obtenerSesion: jest.fn().mockResolvedValue(null),
    eliminarSesion: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock de uuid para controlar el valor generado en tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('Sesion Servicio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crearSesion', () => {
    it('debe generar un sessionId UUID y guardarlo en Redis con TTL 86400', async () => {
      const sessionId = await sesionServicio.crearSesion(1, 'usuario1');

      expect(sessionId).toBe('mock-uuid-1234');
      expect(redisRepositorio.guardarSesion).toHaveBeenCalledWith(
        'mock-uuid-1234',
        { idUsuario: 1, alias: 'usuario1' },
        86400
      );
    });

    it('debe retornar el sessionId generado', async () => {
      const sessionId = await sesionServicio.crearSesion(42, 'admin');

      expect(typeof sessionId).toBe('string');
      expect(sessionId).toBe('mock-uuid-1234');
    });

    it('debe almacenar idUsuario y alias en los datos de sesión', async () => {
      await sesionServicio.crearSesion(5, 'testuser');

      expect(redisRepositorio.guardarSesion).toHaveBeenCalledWith(
        expect.any(String),
        { idUsuario: 5, alias: 'testuser' },
        86400
      );
    });
  });

  describe('verificarSesion', () => {
    it('debe retornar datos de sesión cuando existe en Redis', async () => {
      const datosSesion: SesionRedis = { idUsuario: 1, alias: 'usuario1' };
      (redisRepositorio.obtenerSesion as jest.Mock).mockResolvedValueOnce(datosSesion);

      const resultado = await sesionServicio.verificarSesion('session-abc');

      expect(redisRepositorio.obtenerSesion).toHaveBeenCalledWith('session-abc');
      expect(resultado).toEqual({ idUsuario: 1, alias: 'usuario1' });
    });

    it('debe retornar null cuando la sesión no existe o expiró', async () => {
      (redisRepositorio.obtenerSesion as jest.Mock).mockResolvedValueOnce(null);

      const resultado = await sesionServicio.verificarSesion('sesion-inexistente');

      expect(redisRepositorio.obtenerSesion).toHaveBeenCalledWith('sesion-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('eliminarSesion', () => {
    it('debe llamar a eliminarSesion del repositorio con el sessionId', async () => {
      await sesionServicio.eliminarSesion('session-to-delete');

      expect(redisRepositorio.eliminarSesion).toHaveBeenCalledWith('session-to-delete');
    });

    it('debe completar sin error incluso si la sesión no existía', async () => {
      (redisRepositorio.eliminarSesion as jest.Mock).mockResolvedValueOnce(undefined);

      await expect(
        sesionServicio.eliminarSesion('no-existe')
      ).resolves.toBeUndefined();
    });
  });
});
