/**
 * Manejadores Socket.io.
 *
 * Este módulo centraliza la lógica de manejo de conexiones Socket.io:
 * - Conexión: el middleware de autenticación (en servidor.socketio.ts) ya verifica
 *   la sesión en Redis y adjunta los datos del usuario al socket. El manejador de
 *   conexión une al socket a la sala `usuario:{idUsuario}`.
 * - Reconexión: si la sesión del cliente sigue válida en Redis, el middleware de
 *   autenticación permite la reconexión sin que el usuario deba re-autenticarse.
 *   Esto se logra porque el middleware verifica la cookie de sesión en cada intento
 *   de conexión (incluidas reconexiones).
 * - Emisión dirigida: la función `emitirAUsuario` permite a otros módulos (como
 *   los manejadores MQTT) enviar eventos a un usuario específico a través de su sala.
 *
 * Requisitos cubiertos: 10.1, 10.2, 10.4, 10.5
 */

export { emitirAUsuario } from './emisor.socketio';
