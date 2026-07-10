import { onConexion, onDesconexion, onPublicacion } from './manejadores.mqtt';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import * as localizacionServicio from '../servicios/localizacion.servicio';
import * as emisorSocketio from '../socketio/emisor.socketio';

// Mocks
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio', () => ({
  redisRepositorio: {
    obtenerEstadoDispositivo: jest.fn(),
    guardarEstadoDispositivo: jest.fn(),
  },
}));
jest.mock('../servicios/localizacion.servicio');
jest.mock('../socketio/emisor.socketio');

const mockDispositivoRepo = dispositivoRepo as jest.Mocked<typeof dispositivoRepo>;
const mockRedisRepo = redisRepositorio as jest.Mocked<typeof redisRepositorio>;
const mockLocalizacionServicio = localizacionServicio as jest.Mocked<typeof localizacionServicio>;
const mockEmisor = emisorSocketio as jest.Mocked<typeof emisorSocketio>;

describe('Manejadores MQTT', () => {
  const uuidDispositivo = '550e8400-e29b-41d4-a716-446655440000';
  const dispositivoMock: dispositivoRepo.Dispositivo = {
    id: 1,
    uuid: uuidDispositivo,
    id_usuario: 42,
    id_pre_dispositivo: 10,
    telefono: '3001234567',
    creado_en: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =====================
  // onConexion
  // =====================
  describe('onConexion', () => {
    it('debe actualizar Redis a "conectado" y emitir evento cuando el dispositivo existe', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);
      mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
        estadoConexion: 'desconectado',
        localizacion: { latitud: 4.5, longitud: -74.0, altitud: 2600 },
        estado: '',
        alarma: '',
        estadoDirecto: '',
      });
      mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

      await onConexion(uuidDispositivo);

      expect(mockDispositivoRepo.buscarPorUuid).toHaveBeenCalledWith(uuidDispositivo);
      expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledWith(uuidDispositivo, {
        estadoConexion: 'conectado',
        localizacion: { latitud: 4.5, longitud: -74.0, altitud: 2600 },
        estado: '',
        alarma: '',
        estadoDirecto: '',
      });
      expect(mockEmisor.emitirAUsuario).toHaveBeenCalledWith(42, 'dispositivo:estado', {
        dispositivoId: 1,
        estadoConexion: 'conectado',
      });
    });

    it('debe crear estado por defecto cuando no existe en Redis', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);
      mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue(null);
      mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

      await onConexion(uuidDispositivo);

      expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledWith(uuidDispositivo, {
        estadoConexion: 'conectado',
        localizacion: null,
        estado: '',
        alarma: '',
        estadoDirecto: '',
      });
      expect(mockEmisor.emitirAUsuario).toHaveBeenCalledWith(42, 'dispositivo:estado', {
        dispositivoId: 1,
        estadoConexion: 'conectado',
      });
    });

    it('no debe hacer nada si el dispositivo no existe en BD', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(null);

      await onConexion('uuid-inexistente');

      expect(mockRedisRepo.guardarEstadoDispositivo).not.toHaveBeenCalled();
      expect(mockEmisor.emitirAUsuario).not.toHaveBeenCalled();
    });
  });

  // =====================
  // onDesconexion
  // =====================
  describe('onDesconexion', () => {
    it('debe actualizar Redis a "desconectado" y emitir evento cuando el dispositivo existe', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);
      mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue({
        estadoConexion: 'conectado',
        localizacion: { latitud: 4.5, longitud: -74.0, altitud: 2600 },
        estado: 'activo',
        alarma: '',
        estadoDirecto: '',
      });
      mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

      await onDesconexion(uuidDispositivo);

      expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledWith(uuidDispositivo, {
        estadoConexion: 'desconectado',
        localizacion: { latitud: 4.5, longitud: -74.0, altitud: 2600 },
        estado: 'activo',
        alarma: '',
        estadoDirecto: '',
      });
      expect(mockEmisor.emitirAUsuario).toHaveBeenCalledWith(42, 'dispositivo:estado', {
        dispositivoId: 1,
        estadoConexion: 'desconectado',
      });
    });

    it('debe crear estado con "desconectado" cuando no existe en Redis', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);
      mockRedisRepo.obtenerEstadoDispositivo.mockResolvedValue(null);
      mockRedisRepo.guardarEstadoDispositivo.mockResolvedValue(undefined);

      await onDesconexion(uuidDispositivo);

      expect(mockRedisRepo.guardarEstadoDispositivo).toHaveBeenCalledWith(uuidDispositivo, {
        estadoConexion: 'desconectado',
        localizacion: null,
        estado: '',
        alarma: '',
        estadoDirecto: '',
      });
      expect(mockEmisor.emitirAUsuario).toHaveBeenCalledWith(42, 'dispositivo:estado', {
        dispositivoId: 1,
        estadoConexion: 'desconectado',
      });
    });

    it('no debe hacer nada si el dispositivo no existe en BD', async () => {
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(null);

      await onDesconexion('uuid-inexistente');

      expect(mockRedisRepo.guardarEstadoDispositivo).not.toHaveBeenCalled();
      expect(mockEmisor.emitirAUsuario).not.toHaveBeenCalled();
    });
  });

  // =====================
  // onPublicacion
  // =====================
  describe('onPublicacion', () => {
    const topicValido = `dispositivos/${uuidDispositivo}/localizacion`;

    function crearMensaje(datos: unknown): Buffer {
      return Buffer.from(JSON.stringify(datos));
    }

    it('debe procesar localización válida y emitir evento al propietario', async () => {
      const mensaje = crearMensaje({ latitud: 4.6097, longitud: -74.0817, altitud: 2640 });
      mockLocalizacionServicio.procesarLocalizacion.mockResolvedValue(undefined);
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);

      const ahora = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(ahora);

      await onPublicacion(topicValido, mensaje);

      expect(mockLocalizacionServicio.procesarLocalizacion).toHaveBeenCalledWith(
        uuidDispositivo, 4.6097, -74.0817, 2640
      );
      expect(mockEmisor.emitirAUsuario).toHaveBeenCalledWith(42, 'localizacion:actualizada', {
        dispositivoId: 1,
        latitud: 4.6097,
        longitud: -74.0817,
        altitud: 2640,
        timestamp: ahora,
      });
    });

    it('debe rechazar topic con formato inválido', async () => {
      await onPublicacion('topic/invalido', crearMensaje({ latitud: 4, longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
      expect(mockEmisor.emitirAUsuario).not.toHaveBeenCalled();
    });

    it('debe rechazar mensaje que no es JSON válido', async () => {
      const mensajeInvalido = Buffer.from('no es json');

      await onPublicacion(topicValido, mensajeInvalido);

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar mensaje sin campo latitud', async () => {
      await onPublicacion(topicValido, crearMensaje({ longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar mensaje sin campo longitud', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: 4, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar mensaje sin campo altitud', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: 4, longitud: -74 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar latitud fuera de rango (> 90)', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: 91, longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar latitud fuera de rango (< -90)', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: -91, longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar longitud fuera de rango (> 180)', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: 4, longitud: 181, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar longitud fuera de rango (< -180)', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: 4, longitud: -181, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe rechazar campos con tipos no numéricos', async () => {
      await onPublicacion(topicValido, crearMensaje({ latitud: '4', longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).not.toHaveBeenCalled();
    });

    it('debe aceptar coordenadas en los límites exactos del rango', async () => {
      mockLocalizacionServicio.procesarLocalizacion.mockResolvedValue(undefined);
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);

      await onPublicacion(topicValido, crearMensaje({ latitud: 90, longitud: 180, altitud: 8848 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).toHaveBeenCalledWith(
        uuidDispositivo, 90, 180, 8848
      );
    });

    it('debe aceptar coordenadas negativas en los límites exactos', async () => {
      mockLocalizacionServicio.procesarLocalizacion.mockResolvedValue(undefined);
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(dispositivoMock);

      await onPublicacion(topicValido, crearMensaje({ latitud: -90, longitud: -180, altitud: 0 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).toHaveBeenCalledWith(
        uuidDispositivo, -90, -180, 0
      );
    });

    it('no debe emitir evento si el dispositivo no existe en BD después de procesar', async () => {
      mockLocalizacionServicio.procesarLocalizacion.mockResolvedValue(undefined);
      mockDispositivoRepo.buscarPorUuid.mockResolvedValue(null);

      await onPublicacion(topicValido, crearMensaje({ latitud: 4, longitud: -74, altitud: 100 }));

      expect(mockLocalizacionServicio.procesarLocalizacion).toHaveBeenCalled();
      expect(mockEmisor.emitirAUsuario).not.toHaveBeenCalled();
    });
  });
});
