import type { Dispositivo } from '../repositorios/dispositivo.repositorio';
import type { Localizacion } from '../repositorios/localizacion.repositorio';
import type { EstadoDispositivoRedis } from '../repositorios/redis.repositorio';

// Mocks de repositorios y utilidades
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/localizacion.repositorio');
jest.mock('../repositorios/redis.repositorio');
jest.mock('../utilidades/distancia.util');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionRepo from '../repositorios/localizacion.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { calcularDistanciaHaversine } from '../utilidades/distancia.util';
import { procesarLocalizacion, obtenerUltimaLocalizacion } from './localizacion.servicio';

const mockBuscarPorUuid = dispositivoRepo.buscarPorUuid as jest.MockedFunction<typeof dispositivoRepo.buscarPorUuid>;
const mockBuscarPorId = dispositivoRepo.buscarPorId as jest.MockedFunction<typeof dispositivoRepo.buscarPorId>;
const mockObtenerUltima = localizacionRepo.obtenerUltima as jest.MockedFunction<typeof localizacionRepo.obtenerUltima>;
const mockInsertar = localizacionRepo.insertar as jest.MockedFunction<typeof localizacionRepo.insertar>;
const mockObtenerEstadoDispositivo = redisRepositorio.obtenerEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.obtenerEstadoDispositivo>;
const mockGuardarEstadoDispositivo = redisRepositorio.guardarEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.guardarEstadoDispositivo>;
const mockCalcularDistancia = calcularDistanciaHaversine as jest.MockedFunction<typeof calcularDistanciaHaversine>;

describe('Servicio de localización — procesarLocalizacion', () => {
  const dispositivoMock: Dispositivo = {
    id: 5,
    uuid: 'abc-123-uuid',
    id_usuario: 1,
    id_pre_dispositivo: 10,
    telefono: '5551234567',
    creado_en: new Date('2024-01-01'),
  };

  const estadoRedisMock: EstadoDispositivoRedis = {
    estadoConexion: 'conectado',
    localizacion: { latitud: 19.4326, longitud: -99.1332, altitud: 2240 },
    estado: '',
    alarma: '',
    estadoDirecto: '',
  };

  const localizacionBDMock: Localizacion = {
    id: 1,
    id_dispositivo: 5,
    latitud: 19.4326,
    longitud: -99.1332,
    altitud: 2240,
    creado_en: new Date('2024-01-10'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuscarPorUuid.mockResolvedValue(dispositivoMock);
    mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedisMock);
    mockGuardarEstadoDispositivo.mockResolvedValue(undefined);
    mockObtenerUltima.mockResolvedValue(localizacionBDMock);
    mockInsertar.mockResolvedValue(undefined);
    mockCalcularDistancia.mockReturnValue(100); // > 50m por defecto
  });

  it('debe buscar el dispositivo por UUID', async () => {
    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockBuscarPorUuid).toHaveBeenCalledWith('abc-123-uuid');
  });

  it('debe retornar sin hacer nada si el dispositivo no existe', async () => {
    mockBuscarPorUuid.mockResolvedValue(null);

    await procesarLocalizacion('uuid-inexistente', 19.44, -99.14, 2250);

    expect(mockGuardarEstadoDispositivo).not.toHaveBeenCalled();
    expect(mockObtenerUltima).not.toHaveBeenCalled();
    expect(mockInsertar).not.toHaveBeenCalled();
  });

  it('debe actualizar el estado en Redis con la nueva localización', async () => {
    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockGuardarEstadoDispositivo).toHaveBeenCalledWith('abc-123-uuid', {
      estadoConexion: 'conectado',
      localizacion: { latitud: 19.44, longitud: -99.14, altitud: 2250 },
      estado: '',
      alarma: '',
      estadoDirecto: '',
    });
  });

  it('debe preservar el estado existente de Redis al actualizar localización', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue({
      estadoConexion: 'conectado',
      localizacion: { latitud: 19.0, longitud: -99.0, altitud: 2200 },
      estado: 'activo',
      alarma: 'ninguna',
      estadoDirecto: 'ok',
    });

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockGuardarEstadoDispositivo).toHaveBeenCalledWith('abc-123-uuid', {
      estadoConexion: 'conectado',
      localizacion: { latitud: 19.44, longitud: -99.14, altitud: 2250 },
      estado: 'activo',
      alarma: 'ninguna',
      estadoDirecto: 'ok',
    });
  });

  it('debe usar valores por defecto si no existe estado previo en Redis', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue(null);

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockGuardarEstadoDispositivo).toHaveBeenCalledWith('abc-123-uuid', {
      estadoConexion: 'conectado',
      localizacion: { latitud: 19.44, longitud: -99.14, altitud: 2250 },
      estado: '',
      alarma: '',
      estadoDirecto: '',
    });
  });

  it('debe insertar en BD si es la primera localización (no hay previa en BD)', async () => {
    mockObtenerUltima.mockResolvedValue(null);

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockInsertar).toHaveBeenCalledWith(5, 19.44, -99.14, 2250);
  });

  it('debe insertar en BD si la distancia es >= 50 metros', async () => {
    mockCalcularDistancia.mockReturnValue(50); // exactamente 50m

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockInsertar).toHaveBeenCalledWith(5, 19.44, -99.14, 2250);
  });

  it('debe insertar en BD si la distancia es mayor a 50 metros', async () => {
    mockCalcularDistancia.mockReturnValue(150);

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockInsertar).toHaveBeenCalledWith(5, 19.44, -99.14, 2250);
  });

  it('NO debe insertar en BD si la distancia es menor a 50 metros', async () => {
    mockCalcularDistancia.mockReturnValue(49.9);

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockInsertar).not.toHaveBeenCalled();
  });

  it('debe calcular la distancia usando las coordenadas de la última localización en BD', async () => {
    await procesarLocalizacion('abc-123-uuid', 19.50, -99.20, 2300);

    expect(mockCalcularDistancia).toHaveBeenCalledWith(
      19.4326,  // lat de BD
      -99.1332, // lng de BD
      19.50,    // lat nueva
      -99.20    // lng nueva
    );
  });

  it('no debe calcular distancia si no hay localización previa en BD', async () => {
    mockObtenerUltima.mockResolvedValue(null);

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockCalcularDistancia).not.toHaveBeenCalled();
  });

  it('siempre debe actualizar Redis incluso si no se inserta en BD', async () => {
    mockCalcularDistancia.mockReturnValue(10); // < 50m

    await procesarLocalizacion('abc-123-uuid', 19.44, -99.14, 2250);

    expect(mockGuardarEstadoDispositivo).toHaveBeenCalled();
    expect(mockInsertar).not.toHaveBeenCalled();
  });
});

describe('Servicio de localización — obtenerUltimaLocalizacion', () => {
  const dispositivoMock: Dispositivo = {
    id: 5,
    uuid: 'abc-123-uuid',
    id_usuario: 1,
    id_pre_dispositivo: 10,
    telefono: '5551234567',
    creado_en: new Date('2024-01-01'),
  };

  const estadoRedisConLocalizacion: EstadoDispositivoRedis = {
    estadoConexion: 'conectado',
    localizacion: { latitud: 19.44, longitud: -99.14, altitud: 2250 },
    estado: '',
    alarma: '',
    estadoDirecto: '',
  };

  const estadoRedisSinLocalizacion: EstadoDispositivoRedis = {
    estadoConexion: 'conectado',
    localizacion: null,
    estado: '',
    alarma: '',
    estadoDirecto: '',
  };

  const localizacionBDMock: Localizacion = {
    id: 1,
    id_dispositivo: 5,
    latitud: 19.4326,
    longitud: -99.1332,
    altitud: 2240,
    creado_en: new Date('2024-01-10'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuscarPorId.mockResolvedValue(dispositivoMock);
    mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedisConLocalizacion);
    mockObtenerUltima.mockResolvedValue(localizacionBDMock);
  });

  it('debe buscar el dispositivo por ID para obtener su UUID', async () => {
    await obtenerUltimaLocalizacion(5);

    expect(mockBuscarPorId).toHaveBeenCalledWith(5);
  });

  it('debe retornar null si el dispositivo no existe', async () => {
    mockBuscarPorId.mockResolvedValue(null);

    const resultado = await obtenerUltimaLocalizacion(999);

    expect(resultado).toBeNull();
  });

  it('debe retornar la localización de Redis si existe', async () => {
    const resultado = await obtenerUltimaLocalizacion(5);

    expect(resultado).toEqual({ latitud: 19.44, longitud: -99.14, altitud: 2250 });
  });

  it('no debe consultar la BD si Redis tiene localización', async () => {
    await obtenerUltimaLocalizacion(5);

    expect(mockObtenerUltima).not.toHaveBeenCalled();
  });

  it('debe consultar la BD si Redis no tiene datos del dispositivo', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue(null);

    await obtenerUltimaLocalizacion(5);

    expect(mockObtenerUltima).toHaveBeenCalledWith(5);
  });

  it('debe consultar la BD si Redis tiene estado pero sin localización', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue(estadoRedisSinLocalizacion);

    await obtenerUltimaLocalizacion(5);

    expect(mockObtenerUltima).toHaveBeenCalledWith(5);
  });

  it('debe retornar la localización de BD si Redis no tiene datos', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue(null);

    const resultado = await obtenerUltimaLocalizacion(5);

    expect(resultado).toEqual({ latitud: 19.4326, longitud: -99.1332, altitud: 2240 });
  });

  it('debe retornar null si ni Redis ni BD tienen localización', async () => {
    mockObtenerEstadoDispositivo.mockResolvedValue(null);
    mockObtenerUltima.mockResolvedValue(null);

    const resultado = await obtenerUltimaLocalizacion(5);

    expect(resultado).toBeNull();
  });

  it('debe usar el UUID del dispositivo para consultar Redis', async () => {
    await obtenerUltimaLocalizacion(5);

    expect(mockObtenerEstadoDispositivo).toHaveBeenCalledWith('abc-123-uuid');
  });
});
