/**
 * Property-Based Test: Middleware de sesión protege rutas
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * Para cualquier solicitud a una ruta protegida:
 * - Si la cookie httpOnly está ausente, contiene un identificador inexistente en Redis,
 *   o la sesión ha expirado → responde 401 sin ejecutar la lógica de negocio (handler)
 * - Si la sesión es válida → permite el acceso e inyecta el identificador del usuario
 *   correcto en req.usuario
 */
import fc from 'fast-check';
import { Response, NextFunction } from 'express';
import { middlewareSesion, RequestAutenticado } from './sesion.middleware';
import { sesionServicio } from '../servicios/sesion.servicio';

// Mock del servicio de sesión
jest.mock('../servicios/sesion.servicio', () => ({
  sesionServicio: {
    verificarSesion: jest.fn(),
  },
}));

/**
 * Arbitrary: genera un sessionId con formato UUID v4
 */
const sessionIdArb = fc.uuid();

/**
 * Arbitrary: genera un alias válido (alfanumérico, 3-20 caracteres)
 */
const aliasArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{2,19}$/);

/**
 * Arbitrary: genera un idUsuario positivo
 */
const idUsuarioArb = fc.integer({ min: 1, max: 100000 });

/**
 * Escenario de solicitud sin autenticación válida
 */
type EscenarioInvalido = 'sin-cookie' | 'sessionId-inexistente' | 'sesion-expirada';

const escenarioInvalidoArb: fc.Arbitrary<EscenarioInvalido> = fc.constantFrom(
  'sin-cookie',
  'sessionId-inexistente',
  'sesion-expirada'
);

/**
 * Crea mocks de Request, Response y NextFunction para testing del middleware
 */
function crearMocks(cookies?: Record<string, string>) {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

  const req: Partial<RequestAutenticado> = {
    cookies: cookies,
  };

  const res: Partial<Response> = {
    status: statusMock,
  };

  const next: NextFunction = jest.fn();

  return { req, res, next, statusMock, jsonMock };
}

describe('Property Test — Middleware de sesión protege rutas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 6 (rechazo): Para solicitudes sin cookie, con sessionId inexistente o sesión expirada, responde 401 sin ejecutar handler', async () => {
    await fc.assert(
      fc.asyncProperty(
        escenarioInvalidoArb,
        sessionIdArb,
        async (escenario, sessionId) => {
          jest.clearAllMocks();

          let cookies: Record<string, string> | undefined;

          switch (escenario) {
            case 'sin-cookie':
              // No se proporciona cookie de sesión
              cookies = {};
              break;
            case 'sessionId-inexistente':
              // Cookie presente pero sessionId no existe en Redis
              cookies = { sessionId };
              (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce(null);
              break;
            case 'sesion-expirada':
              // Cookie presente pero la sesión ya expiró (Redis retorna null)
              cookies = { sessionId };
              (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce(null);
              break;
          }

          const { req, res, next, statusMock, jsonMock } = crearMocks(cookies);

          await middlewareSesion(req as RequestAutenticado, res as Response, next);

          // PROPIEDAD (Req 4.2): Responde con código 401
          expect(statusMock).toHaveBeenCalledWith(401);
          expect(jsonMock).toHaveBeenCalledWith({ error: 'No autorizado' });

          // PROPIEDAD (Req 4.2): No ejecuta la lógica de negocio (next no se llama)
          expect(next).not.toHaveBeenCalled();

          // PROPIEDAD: No se inyecta usuario en la solicitud
          expect(req.usuario).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6 (acceso): Para sesión válida, permite acceso e inyecta usuario correcto en req.usuario', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionIdArb,
        idUsuarioArb,
        aliasArb,
        async (sessionId, idUsuario, alias) => {
          jest.clearAllMocks();

          // Configurar sesión válida: verificarSesion retorna datos del usuario
          (sesionServicio.verificarSesion as jest.Mock).mockResolvedValueOnce({
            idUsuario,
            alias,
          });

          const { req, res, next, statusMock, jsonMock } = crearMocks({ sessionId });

          await middlewareSesion(req as RequestAutenticado, res as Response, next);

          // PROPIEDAD (Req 4.3): Permite el acceso — next() es invocado
          expect(next).toHaveBeenCalled();

          // PROPIEDAD (Req 4.3): Inyecta usuario correcto con id y alias
          expect(req.usuario).toEqual({ id: idUsuario, alias });

          // PROPIEDAD (Req 4.1): Se verificó la sesión con el sessionId de la cookie
          expect(sesionServicio.verificarSesion).toHaveBeenCalledWith(sessionId);

          // PROPIEDAD: No se envía respuesta de error
          expect(statusMock).not.toHaveBeenCalled();
          expect(jsonMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
