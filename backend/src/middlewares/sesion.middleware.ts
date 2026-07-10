import { Request, Response, NextFunction } from 'express';
import { sesionServicio } from '../servicios/sesion.servicio';

/**
 * Extensión del tipo Request de Express para incluir datos del usuario autenticado.
 */
export interface RequestAutenticado extends Request {
  usuario?: {
    id: number;
    alias: string;
  };
}

/**
 * Middleware de sesión que protege rutas autenticadas.
 *
 * Flujo:
 * 1. Extrae el sessionId de la cookie httpOnly
 * 2. Verifica la sesión en Redis mediante el servicio de sesión
 * 3. Si la cookie no existe o la sesión es inválida/expirada → responde 401
 * 4. Si la sesión es válida → inyecta req.usuario con { id, alias } y llama next()
 *
 * Valida: Requisitos 4.1, 4.2, 4.3
 */
export async function middlewareSesion(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const datos = await sesionServicio.verificarSesion(sessionId);

  if (!datos) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  req.usuario = { id: datos.idUsuario, alias: datos.alias };
  next();
}
