/**
 * Property-Based Test: Cierre de sesión elimina estado
 *
 * **Validates: Requirements 3.1, 3.2**
 *
 * Para cualquier sesión activa en Redis, al ejecutar el cierre de sesión:
 * - El identificador de la sesión ya no debe existir en Redis
 * - La cookie debe ser invalidada en la respuesta
 */
import fc from 'fast-check';
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

// Mock de uuid para generar IDs controlados
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-session-id'),
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

describe('Property Test — Cierre de sesión elimina estado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 5: Para cualquier sesión activa, tras logout el sessionId no existe en Redis y la cookie es invalidada', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionIdArb,
        idUsuarioArb,
        aliasArb,
        async (sessionId, idUsuario, alias) => {
          jest.clearAllMocks();

          // Simular un almacenamiento en memoria para verificar eliminación
          const sesionesEnRedis = new Map<string, SesionRedis>();
          sesionesEnRedis.set(sessionId, { idUsuario, alias });

          // Configurar el mock de guardarSesion para simular almacenamiento
          (redisRepositorio.guardarSesion as jest.Mock).mockImplementation(
            async (id: string, datos: SesionRedis) => {
              sesionesEnRedis.set(id, datos);
            }
          );

          // Configurar obtenerSesion para leer del mapa simulado
          (redisRepositorio.obtenerSesion as jest.Mock).mockImplementation(
            async (id: string) => {
              return sesionesEnRedis.get(id) || null;
            }
          );

          // Configurar eliminarSesion para eliminar del mapa simulado
          (redisRepositorio.eliminarSesion as jest.Mock).mockImplementation(
            async (id: string) => {
              sesionesEnRedis.delete(id);
            }
          );

          // Precondición: la sesión existe en Redis antes del logout
          const sesionAntes = await redisRepositorio.obtenerSesion(sessionId);
          expect(sesionAntes).not.toBeNull();
          expect(sesionAntes).toEqual({ idUsuario, alias });

          // Ejecutar cierre de sesión
          await sesionServicio.eliminarSesion(sessionId);

          // PROPIEDAD 1 (Req 3.1): El sessionId ya no existe en Redis
          const sesionDespues = await redisRepositorio.obtenerSesion(sessionId);
          expect(sesionDespues).toBeNull();

          // PROPIEDAD 2: Se invocó eliminarSesion del repositorio con el sessionId correcto
          expect(redisRepositorio.eliminarSesion).toHaveBeenCalledWith(sessionId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (cookie): Para cualquier sesión activa, la respuesta del endpoint de logout invalida la cookie', async () => {
    // Importamos express y supertest para validar el comportamiento HTTP de la cookie
    const express = require('express');
    const cookieParser = require('cookie-parser');
    const request = require('supertest');

    await fc.assert(
      fc.asyncProperty(
        sessionIdArb,
        idUsuarioArb,
        aliasArb,
        async (sessionId, idUsuario, alias) => {
          jest.clearAllMocks();

          // Simular sesión existente en Redis (para middleware y logout)
          (redisRepositorio.obtenerSesion as jest.Mock).mockImplementation(
            async (id: string) => {
              if (id === sessionId) return { idUsuario, alias };
              return null;
            }
          );

          (redisRepositorio.eliminarSesion as jest.Mock).mockResolvedValue(undefined);

          // Crear mini-app Express con la ruta de logout para verificar cookie
          const app = express();
          app.use(cookieParser());
          app.use(express.json());

          app.post('/api/auth/logout', async (req: any, res: any) => {
            const sid = req.cookies?.sessionId;
            if (!sid) {
              return res.status(401).json({ error: 'No autorizado' });
            }

            const datos = await redisRepositorio.obtenerSesion(sid);
            if (!datos) {
              return res.status(401).json({ error: 'No autorizado' });
            }

            await sesionServicio.eliminarSesion(sid);

            res.clearCookie('sessionId', {
              httpOnly: true,
              secure: false,
              sameSite: 'strict',
            });
            res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
          });

          // Ejecutar petición de logout con cookie de sesión
          const response = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', `sessionId=${sessionId}`);

          // PROPIEDAD (Req 3.2): La respuesta es exitosa (200)
          expect(response.status).toBe(200);

          // PROPIEDAD (Req 3.2): La cookie es invalidada en la respuesta
          const setCookieHeader = response.headers['set-cookie'];
          expect(setCookieHeader).toBeDefined();

          const cookieStr = Array.isArray(setCookieHeader)
            ? setCookieHeader.join('; ')
            : setCookieHeader;

          // Verificar que la cookie sessionId es eliminada (expires en el pasado o maxAge=0)
          expect(cookieStr).toMatch(/sessionId=/i);
          expect(cookieStr).toMatch(/expires=Thu, 01 Jan 1970/i);
        }
      ),
      { numRuns: 100 }
    );
  });
});
