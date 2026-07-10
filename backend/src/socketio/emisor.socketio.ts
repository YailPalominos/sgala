/**
 * Módulo emisor de Socket.io.
 *
 * Permite emitir eventos a usuarios específicos mediante su sala Socket.io.
 * La sala de cada usuario tiene el formato `usuario:{idUsuario}`.
 *
 * Este módulo es utilizado por los manejadores MQTT para notificar al frontend
 * sobre actualizaciones de localización y cambios de estado de conexión de dispositivos.
 */

import { ioInstance } from './servidor.socketio';

/**
 * Emite un evento Socket.io a un usuario específico.
 * El evento se dirige a la sala del usuario identificada por su ID.
 *
 * Si el servidor Socket.io no ha sido inicializado aún (ioInstance es undefined),
 * se registra una advertencia y se descarta la emisión sin lanzar errores.
 *
 * @param idUsuario - ID numérico del usuario destinatario
 * @param evento - Nombre del evento Socket.io a emitir
 * @param datos - Datos a enviar con el evento
 */
export function emitirAUsuario(idUsuario: number, evento: string, datos: unknown): void {
  if (!ioInstance) {
    console.warn(
      `[Socket.io Emisor] Servidor no inicializado. No se puede emitir "${evento}" al usuario ${idUsuario}`
    );
    return;
  }

  ioInstance.to(`usuario:${idUsuario}`).emit(evento, datos);
}
