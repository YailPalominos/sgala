const mockQuery = jest.fn();
const mockInput = jest.fn().mockReturnThis();
const mockRequest = jest.fn(() => ({ input: mockInput, query: mockQuery }));

jest.mock('../configuracion/base-datos', () => ({
  conexionPool: Promise.resolve({
    request: mockRequest,
  }),
}));

import { buscarPorUuid, estaVinculado } from './pre-dispositivo.repositorio';

describe('pre-dispositivo.repositorio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInput.mockReturnThis();
  });

  describe('buscarPorUuid', () => {
    it('debe retornar el pre-dispositivo cuando existe', async () => {
      const preDispositivo = {
        id: 1,
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        creado_en: new Date('2024-01-01'),
      };
      mockQuery.mockResolvedValue({ recordset: [preDispositivo] });

      const resultado = await buscarPorUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(resultado).toEqual(preDispositivo);
      expect(mockInput).toHaveBeenCalledWith('uuid', expect.anything(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(mockQuery).toHaveBeenCalledWith('SELECT id, uuid, creado_en FROM pre_dispositivos WHERE uuid = @uuid');
    });

    it('debe retornar null cuando el UUID no existe', async () => {
      mockQuery.mockResolvedValue({ recordset: [] });

      const resultado = await buscarPorUuid('00000000-0000-0000-0000-000000000000');

      expect(resultado).toBeNull();
    });
  });

  describe('estaVinculado', () => {
    it('debe retornar true cuando el pre-dispositivo está vinculado', async () => {
      mockQuery.mockResolvedValue({ recordset: [{ total: 1 }] });

      const resultado = await estaVinculado(5);

      expect(resultado).toBe(true);
      expect(mockInput).toHaveBeenCalledWith('idPreDispositivo', expect.anything(), 5);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS total FROM dispositivos WHERE id_pre_dispositivo = @idPreDispositivo'
      );
    });

    it('debe retornar false cuando el pre-dispositivo no está vinculado', async () => {
      mockQuery.mockResolvedValue({ recordset: [{ total: 0 }] });

      const resultado = await estaVinculado(10);

      expect(resultado).toBe(false);
    });
  });
});
