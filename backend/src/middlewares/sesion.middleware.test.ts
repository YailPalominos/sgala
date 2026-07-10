import { Response, NextFunction } from 'express';
import { middlewareSesion, RequestAutenticado } from './sesion.middleware';
import { sesionServicio } from '../servicios/sesion.servicio';

// Mock del servicio de sesión
jest.mock('../servicios/sesion.servicio', () => ({
  sesionServicio: {
    verificarSesion: jest.fn(),
  },
}));

describe('sesion.middleware - middlewareSesion', () => {
  let req: Partial<RequestAutenticado>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      cookies: {},
    };
    res = {
      status: statusMock,
    };
    next = jest.fn();
  });

  describe('sin cookie de sesión', () => {
    it('debe responder 401 cuando no hay cookie sessionId', async () => {
      req.cookies = {};

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe responder 401 cuando cookies es undefined', async () => {
      req.cookies = undefined;

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('no debe llamar a verificarSesion cuando no hay cookie', async () => {
      req.cookies = {};

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(sesionServicio.verificarSesion).not.toHaveBeenCalled();
    });
  });

  describe('sesión inválida en Redis', () => {
    it('debe responder 401 cuando la sesión no existe en Redis', async () => {
      req.cookies = { sessionId: 'sesion-inexistente' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce(null);

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(sesionServicio.verificarSesion).toHaveBeenCalledWith('sesion-inexistente');
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe responder 401 cuando la sesión ha expirado (retorna null)', async () => {
      req.cookies = { sessionId: 'sesion-expirada' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce(null);

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No autorizado' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sesión válida', () => {
    it('debe inyectar req.usuario con id y alias cuando la sesión es válida', async () => {
      req.cookies = { sessionId: 'sesion-valida-123' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce({
        idUsuario: 42,
        alias: 'usuario1',
      });

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(req.usuario).toEqual({ id: 42, alias: 'usuario1' });
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('debe llamar a verificarSesion con el sessionId de la cookie', async () => {
      req.cookies = { sessionId: 'mi-sesion-id' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce({
        idUsuario: 7,
        alias: 'admin',
      });

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(sesionServicio.verificarSesion).toHaveBeenCalledWith('mi-sesion-id');
    });

    it('debe mapear idUsuario a id en req.usuario', async () => {
      req.cookies = { sessionId: 'otra-sesion' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce({
        idUsuario: 100,
        alias: 'testAlias',
      });

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(req.usuario).toHaveProperty('id', 100);
      expect(req.usuario).toHaveProperty('alias', 'testAlias');
    });

    it('no debe responder con status cuando la sesión es válida', async () => {
      req.cookies = { sessionId: 'sesion-ok' };
      (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce({
        idUsuario: 1,
        alias: 'user',
      });

      await middlewareSesion(req as RequestAutenticado, res as Response, next);

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });
});
