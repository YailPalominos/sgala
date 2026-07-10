/**
 * Tests unitarios para el módulo emisor de Socket.io.
 *
 * Verifica que emitirAUsuario:
 * - Emite eventos a la sala correcta del usuario
 * - No lanza errores cuando ioInstance no está inicializado
 * - Pasa los datos correctos al emit
 */

// Mock del módulo servidor.socketio para controlar ioInstance
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));

jest.mock('./servidor.socketio', () => ({
  get ioInstance() {
    return mockIoInstance;
  },
}));

let mockIoInstance: { to: jest.Mock } | undefined;

import { emitirAUsuario } from './emisor.socketio';

describe('emisor.socketio - emitirAUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIoInstance = { to: mockTo };
  });

  it('debe emitir el evento a la sala del usuario con formato "usuario:{id}"', () => {
    emitirAUsuario(42, 'localizacion:actualizada', { lat: 10 });

    expect(mockTo).toHaveBeenCalledWith('usuario:42');
    expect(mockEmit).toHaveBeenCalledWith('localizacion:actualizada', { lat: 10 });
  });

  it('debe manejar diferentes IDs de usuario correctamente', () => {
    emitirAUsuario(1, 'dispositivo:estado', { estadoConexion: 'conectado' });

    expect(mockTo).toHaveBeenCalledWith('usuario:1');
    expect(mockEmit).toHaveBeenCalledWith('dispositivo:estado', { estadoConexion: 'conectado' });
  });

  it('no debe lanzar error si ioInstance es undefined (servidor no inicializado)', () => {
    mockIoInstance = undefined;

    expect(() => {
      emitirAUsuario(5, 'test:evento', { dato: 'valor' });
    }).not.toThrow();

    expect(mockTo).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('debe registrar advertencia en consola si ioInstance es undefined', () => {
    mockIoInstance = undefined;
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    emitirAUsuario(7, 'evento:test', {});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Servidor no inicializado')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('evento:test')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('7')
    );

    consoleSpy.mockRestore();
  });

  it('debe pasar datos complejos sin modificarlos', () => {
    const datos = {
      dispositivoId: 3,
      latitud: 19.4326,
      longitud: -99.1332,
      altitud: 2250,
      timestamp: 1700000000000,
    };

    emitirAUsuario(10, 'localizacion:actualizada', datos);

    expect(mockEmit).toHaveBeenCalledWith('localizacion:actualizada', datos);
  });

  it('debe manejar datos null correctamente', () => {
    emitirAUsuario(1, 'evento:null', null);

    expect(mockTo).toHaveBeenCalledWith('usuario:1');
    expect(mockEmit).toHaveBeenCalledWith('evento:null', null);
  });

  it('debe emitir múltiples eventos de forma independiente', () => {
    emitirAUsuario(1, 'evento:uno', { n: 1 });
    emitirAUsuario(2, 'evento:dos', { n: 2 });

    expect(mockTo).toHaveBeenCalledTimes(2);
    expect(mockTo).toHaveBeenNthCalledWith(1, 'usuario:1');
    expect(mockTo).toHaveBeenNthCalledWith(2, 'usuario:2');
    expect(mockEmit).toHaveBeenNthCalledWith(1, 'evento:uno', { n: 1 });
    expect(mockEmit).toHaveBeenNthCalledWith(2, 'evento:dos', { n: 2 });
  });
});
