import sql from 'mssql';

// Mock del módulo de base de datos
const mockRequest = {
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
};

const mockPool = {
  request: jest.fn(() => mockRequest),
};

jest.mock('../configuracion/base-datos', () => ({
  conexionPool: Promise.resolve(mockPool),
}));

import {
  crearUsuario,
  buscarPorAlias,
  buscarPorCorreo,
  actualizarContrasena,
  type Usuario,
  type DatosCrearUsuario,
} from './usuario.repositorio';

describe('Repositorio de usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.request.mockReturnValue(mockRequest);
    mockRequest.input.mockReturnThis();
  });

  describe('crearUsuario', () => {
    it('debe insertar un usuario con estatus 1 y retornar el registro creado', async () => {
      const datos: DatosCrearUsuario = {
        alias: 'juanperez',
        correo: 'juan@correo.com',
        contrasena: '$2b$10$hashedpassword',
      };

      const usuarioEsperado: Usuario = {
        id: 1,
        alias: 'juanperez',
        correo: 'juan@correo.com',
        contrasena: '$2b$10$hashedpassword',
        estatus: 1,
        creado_en: new Date('2024-01-01'),
      };

      mockRequest.query.mockResolvedValue({ recordset: [usuarioEsperado] });

      const resultado = await crearUsuario(datos);

      expect(resultado).toEqual(usuarioEsperado);
      expect(mockRequest.input).toHaveBeenCalledWith('alias', sql.VarChar(50), datos.alias);
      expect(mockRequest.input).toHaveBeenCalledWith('correo', sql.VarChar(100), datos.correo);
      expect(mockRequest.input).toHaveBeenCalledWith('contrasena', sql.VarChar(255), datos.contrasena);
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usuarios')
      );
    });

    it('debe usar parámetros parametrizados para prevenir inyección SQL', async () => {
      const datos: DatosCrearUsuario = {
        alias: "'; DROP TABLE usuarios; --",
        correo: 'malicious@test.com',
        contrasena: 'hash123',
      };

      mockRequest.query.mockResolvedValue({
        recordset: [{ id: 2, ...datos, estatus: 1, creado_en: new Date() }],
      });

      await crearUsuario(datos);

      // Verifica que se usan inputs parametrizados, no interpolación de strings
      expect(mockRequest.input).toHaveBeenCalledWith('alias', sql.VarChar(50), datos.alias);
    });
  });

  describe('buscarPorAlias', () => {
    it('debe retornar el usuario cuando el alias existe', async () => {
      const usuarioEsperado: Usuario = {
        id: 1,
        alias: 'juanperez',
        correo: 'juan@correo.com',
        contrasena: '$2b$10$hashedpassword',
        estatus: 1,
        creado_en: new Date('2024-01-01'),
      };

      mockRequest.query.mockResolvedValue({ recordset: [usuarioEsperado] });

      const resultado = await buscarPorAlias('juanperez');

      expect(resultado).toEqual(usuarioEsperado);
      expect(mockRequest.input).toHaveBeenCalledWith('alias', sql.VarChar(50), 'juanperez');
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE alias = @alias')
      );
    });

    it('debe retornar null cuando el alias no existe', async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const resultado = await buscarPorAlias('inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorCorreo', () => {
    it('debe retornar el usuario cuando el correo existe', async () => {
      const usuarioEsperado: Usuario = {
        id: 1,
        alias: 'juanperez',
        correo: 'juan@correo.com',
        contrasena: '$2b$10$hashedpassword',
        estatus: 1,
        creado_en: new Date('2024-01-01'),
      };

      mockRequest.query.mockResolvedValue({ recordset: [usuarioEsperado] });

      const resultado = await buscarPorCorreo('juan@correo.com');

      expect(resultado).toEqual(usuarioEsperado);
      expect(mockRequest.input).toHaveBeenCalledWith('correo', sql.VarChar(100), 'juan@correo.com');
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE correo = @correo')
      );
    });

    it('debe retornar null cuando el correo no existe', async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const resultado = await buscarPorCorreo('noexiste@correo.com');

      expect(resultado).toBeNull();
    });
  });

  describe('actualizarContrasena', () => {
    it('debe ejecutar UPDATE con el id y la nueva contraseña hash', async () => {
      mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

      await actualizarContrasena(5, '$2b$10$nuevohash');

      expect(mockRequest.input).toHaveBeenCalledWith('id', sql.Int, 5);
      expect(mockRequest.input).toHaveBeenCalledWith('contrasena', sql.VarChar(255), '$2b$10$nuevohash');
      expect(mockRequest.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios SET contrasena = @contrasena WHERE id = @id')
      );
    });

    it('no debe retornar ningún valor', async () => {
      mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

      const resultado = await actualizarContrasena(1, 'hash');

      expect(resultado).toBeUndefined();
    });
  });
});
