// Mock del módulo de configuración de base de datos
const mockQuery = jest.fn();
const mockInput = jest.fn().mockReturnThis();
const mockRequest = {
  input: mockInput,
  query: mockQuery,
};
const mockPool = {
  request: jest.fn(() => mockRequest),
};

jest.mock('../configuracion/base-datos', () => ({
  conexionPool: Promise.resolve(mockPool),
}));

import { insertar, obtenerUltima } from './localizacion.repositorio';

describe('localizacion.repositorio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.request.mockReturnValue(mockRequest);
    mockInput.mockReturnThis();
  });

  describe('insertar', () => {
    it('debe insertar un registro de localización con los parámetros correctos', async () => {
      mockQuery.mockResolvedValue({ rowsAffected: [1] });

      await insertar(5, 19.4326077, -99.1332080, 2240.50);

      expect(mockPool.request).toHaveBeenCalled();
      expect(mockInput).toHaveBeenCalledWith('idDispositivo', 5);
      expect(mockInput).toHaveBeenCalledWith('latitud', 19.4326077);
      expect(mockInput).toHaveBeenCalledWith('longitud', -99.1332080);
      expect(mockInput).toHaveBeenCalledWith('altitud', 2240.50);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO localizaciones')
      );
    });

    it('debe propagar errores de la base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      await expect(insertar(1, 0, 0, 0)).rejects.toThrow('Connection failed');
    });
  });

  describe('obtenerUltima', () => {
    it('debe retornar la localización más reciente de un dispositivo', async () => {
      const localizacionMock = {
        id: 10,
        id_dispositivo: 3,
        latitud: 19.4326077,
        longitud: -99.1332080,
        altitud: 2240.50,
        creado_en: new Date('2024-01-15T10:30:00Z'),
      };
      mockQuery.mockResolvedValue({ recordset: [localizacionMock] });

      const resultado = await obtenerUltima(3);

      expect(mockInput).toHaveBeenCalledWith('idDispositivo', 3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT TOP 1')
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY creado_en DESC')
      );
      expect(resultado).toEqual(localizacionMock);
    });

    it('debe retornar null cuando no hay localizaciones para el dispositivo', async () => {
      mockQuery.mockResolvedValue({ recordset: [] });

      const resultado = await obtenerUltima(99);

      expect(resultado).toBeNull();
    });

    it('debe propagar errores de la base de datos', async () => {
      mockQuery.mockRejectedValue(new Error('Timeout'));

      await expect(obtenerUltima(1)).rejects.toThrow('Timeout');
    });
  });
});
