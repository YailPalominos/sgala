import { Router, Response, NextFunction } from 'express';
import { middlewareSesion, RequestAutenticado } from '../middlewares/sesion.middleware';
import * as dispositivoServicio from '../servicios/dispositivo.servicio';

export const dispositivoRouter = Router();

/**
 * GET /api/dispositivos
 * Lista todos los dispositivos del usuario autenticado con su última localización.
 * Protegida por middleware de sesión.
 *
 * Valida: Requisitos 7.1, 7.3
 */
dispositivoRouter.get('/', middlewareSesion, async (req: RequestAutenticado, res: Response, next: NextFunction) => {
  try {
    const idUsuario = req.usuario!.id;
    const dispositivos = await dispositivoServicio.listarDispositivosPorUsuario(idUsuario);
    res.status(200).json(dispositivos);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dispositivos/:id/mapa
 * Obtiene la URL de Google Maps para la última localización de un dispositivo.
 * Protegida por middleware de sesión.
 *
 * Valida: Requisitos 8.1, 8.2, 8.3
 */
dispositivoRouter.get('/:id/mapa', middlewareSesion, async (req: RequestAutenticado, res: Response, next: NextFunction) => {
  try {
    const idUsuario = req.usuario!.id;
    const idDispositivo = parseInt(req.params.id, 10);

    if (isNaN(idDispositivo)) {
      res.status(400).json({ error: 'ID de dispositivo inválido' });
      return;
    }

    const resultado = await dispositivoServicio.obtenerEnlaceMapa(idDispositivo, idUsuario);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});
