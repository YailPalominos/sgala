import { ErrorHttp } from '../utilidades/error-http';
import type { Dispositivo } from '../repositorios/dispositivo.repositorio';
import type { LocalizacionResultado } from './localizacion.servicio';

// Mocks de dependencias
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('./localizacion.servicio');

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { obtenerUltimaLocalizacion } from './localizacion.servicio';
import { listarDispositivosPorUsuario, obtenerEnlaceMapa } from './dispositivo.servicio';

const mockListarPorUsuario = dispositivoRepo.listarPorUsuario as jest.MockedFunction<typeof dispositivoRepo.listarPorUsuario>;
const mockBuscarPorId = dispositivoRepo.buscarPorId as jest.MockedFunction<typeof dispositivoRepo.buscarPorId>;
const mockObtenerUltimaLocalizacion = obtenerUltimaLocalizacion as jest.MockedFunction<typeof obtenerUltimaLocalizacion>;

describe('Servicio de dispositivos — listarDispositivosPorUsuario', () => {
  const dispositivosMock: Dispositivo[] = [
    {
      id: 1,
      uuid: 'uuid-1',
      id_usuario: 10,
      id_pre_dispositivo: 100,
      telefono: '5551111111',
      creado_en: new Date('2024-01-01'),
    },
    {
      id: 2,
      uuid: 'uuid-2',
      id_usuario: 10,
      id_pre_dispositivo: 101,
      telefono: '5552222222',
      creado_en: new Date('2024-01-02'),
    },
  ];

  const localizacionMock: LocalizacionResultado = {
    latitud: 19.4326,
    longitud: -99.1332,
    altitud: 2240,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar arreglo vacío si el usuario no tiene dispositivos', async () => {
    mockListarPorUsuario.mockResolvedValue([]);

    const resultado = await listarDispositivosPorUsuario(10);

    expect(resultado).toEqual([]);
    expect(mockListarPorUsuario).toHaveBeenCalledWith(10);
  });

  it('debe retornar dispositivos con su localización cuando existe', async () => {
    mockListarPorUsuario.mockResolvedValue([dispositivosMock[0]]);
    mockObtenerUltimaLocalizacion.mockResolvedValue(localizacionMock);

    const resultado = await listarDispositivosPorUsuario(10);

    expect(resultado).toEqual([
      {
        id: 1,
        telefono: '5551111111',
        localizacion: localizacionMock,
      },
    ]);
  });

  it('debe retornar localización null cuando el dispositivo no tiene localización', async () => {
    mockListarPorUsuario.mockResolvedValue([dispositivosMock[0]]);
    mockObtenerUltimaLocalizacion.mockResolvedValue(null);

    const resultado = await listarDispositivosPorUsuario(10);

    expect(resultado).toEqual([
      {
        id: 1,
        telefono: '5551111111',
        localizacion: null,
      },
    ]);
  });

  it('debe obtener la localización de cada dispositivo individualmente', async () => {
    mockListarPorUsuario.mockResolvedValue(dispositivosMock);
    mockObtenerUltimaLocalizacion
      .mockResolvedValueOnce(localizacionMock)
      .mockResolvedValueOnce(null);

    const resultado = await listarDispositivosPorUsuario(10);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].localizacion).toEqual(localizacionMock);
    expect(resultado[1].localizacion).toBeNull();
    expect(mockObtenerUltimaLocalizacion).toHaveBeenCalledWith(1);
    expect(mockObtenerUltimaLocalizacion).toHaveBeenCalledWith(2);
  });

  it('debe incluir solo id, telefono y localizacion en la respuesta', async () => {
    mockListarPorUsuario.mockResolvedValue([dispositivosMock[0]]);
    mockObtenerUltimaLocalizacion.mockResolvedValue(localizacionMock);

    const resultado = await listarDispositivosPorUsuario(10);

    expect(Object.keys(resultado[0])).toEqual(['id', 'telefono', 'localizacion']);
  });
});

describe('Servicio de dispositivos — obtenerEnlaceMapa', () => {
  const dispositivoMock: Dispositivo = {
    id: 5,
    uuid: 'uuid-5',
    id_usuario: 10,
    id_pre_dispositivo: 200,
    telefono: '5553333333',
    creado_en: new Date('2024-01-01'),
  };

  const localizacionMock: LocalizacionResultado = {
    latitud: 19.4326,
    longitud: -99.1332,
    altitud: 2240,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Flujo exitoso', () => {
    it('debe retornar URL de Google Maps con las coordenadas correctas', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue(localizacionMock);

      const resultado = await obtenerEnlaceMapa(5, 10);

      expect(resultado.url).toBe('https://www.google.com/maps?q=19.4326,-99.1332');
    });

    it('debe buscar el dispositivo por su ID', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue(localizacionMock);

      await obtenerEnlaceMapa(5, 10);

      expect(mockBuscarPorId).toHaveBeenCalledWith(5);
    });

    it('debe consultar la localización del dispositivo', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue(localizacionMock);

      await obtenerEnlaceMapa(5, 10);

      expect(mockObtenerUltimaLocalizacion).toHaveBeenCalledWith(5);
    });
  });

  describe('Dispositivo no encontrado', () => {
    it('debe lanzar ErrorHttp 404 si el dispositivo no existe', async () => {
      mockBuscarPorId.mockResolvedValue(null);

      await expect(obtenerEnlaceMapa(999, 10))
        .rejects.toMatchObject({ codigo: 404, mensaje: 'Dispositivo no encontrado' });
    });

    it('no debe consultar localización si el dispositivo no existe', async () => {
      mockBuscarPorId.mockResolvedValue(null);

      try { await obtenerEnlaceMapa(999, 10); } catch { /* ignorar */ }

      expect(mockObtenerUltimaLocalizacion).not.toHaveBeenCalled();
    });
  });

  describe('Dispositivo no pertenece al usuario', () => {
    it('debe lanzar ErrorHttp 403 si el dispositivo pertenece a otro usuario', async () => {
      mockBuscarPorId.mockResolvedValue({ ...dispositivoMock, id_usuario: 99 });

      await expect(obtenerEnlaceMapa(5, 10))
        .rejects.toMatchObject({ codigo: 403, mensaje: 'No tienes acceso a este dispositivo' });
    });

    it('no debe consultar localización si el usuario no es propietario', async () => {
      mockBuscarPorId.mockResolvedValue({ ...dispositivoMock, id_usuario: 99 });

      try { await obtenerEnlaceMapa(5, 10); } catch { /* ignorar */ }

      expect(mockObtenerUltimaLocalizacion).not.toHaveBeenCalled();
    });
  });

  describe('Sin localización disponible', () => {
    it('debe lanzar ErrorHttp 404 si no hay localización disponible', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue(null);

      await expect(obtenerEnlaceMapa(5, 10))
        .rejects.toMatchObject({ codigo: 404, mensaje: 'No hay localización disponible para el dispositivo' });
    });
  });

  describe('Formato de URL', () => {
    it('debe construir URL con formato correcto para coordenadas positivas', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue({
        latitud: 40.7128,
        longitud: -74.006,
        altitud: 10,
      });

      const resultado = await obtenerEnlaceMapa(5, 10);

      expect(resultado.url).toBe('https://www.google.com/maps?q=40.7128,-74.006');
    });

    it('debe construir URL con formato correcto para coordenadas negativas', async () => {
      mockBuscarPorId.mockResolvedValue(dispositivoMock);
      mockObtenerUltimaLocalizacion.mockResolvedValue({
        latitud: -33.8688,
        longitud: 151.2093,
        altitud: 5,
      });

      const resultado = await obtenerEnlaceMapa(5, 10);

      expect(resultado.url).toBe('https://www.google.com/maps?q=-33.8688,151.2093');
    });
  });
});
