/**
 * Manejadores MQTT para eventos de conexión, desconexión y publicación de dispositivos.
 *
 * Responsabilidades:
 * - Detectar conexión/desconexión de dispositivos y actualizar Redis
 * - Procesar mensajes de localización y delegarlos al servicio correspondiente
 * - Emitir eventos Socket.io al propietario del dispositivo
 */

import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { redisRepositorio, EstadoDispositivoRedis } from '../repositorios/redis.repositorio';
import { procesarLocalizacion } from '../servicios/localizacion.servicio';
import { emitirAUsuario } from '../socketio/emisor.socketio';

/**
 * Estado por defecto para un dispositivo que se conecta por primera vez.
 */
function crearEstadoPorDefecto(): EstadoDispositivoRedis {
  return {
    estadoConexion: 'conectado',
    localizacion: null,
    estado: '',
    alarma: '',
    estadoDirecto: '',
  };
}

/**
 * Manejador de conexión MQTT de un dispositivo.
 *
 * Flujo:
 * 1. Extraer UUID del clientId (el clientId ES el UUID)
 * 2. Verificar que el dispositivo existe en la base de datos
 * 3. Obtener o crear estado en Redis con estadoConexion = "conectado"
 * 4. Emitir evento "dispositivo:estado" al propietario vía Socket.io
 *
 * @param clienteId - ID del cliente MQTT (UUID del dispositivo)
 */
export async function onConexion(clienteId: string): Promise<void> {
  const uuid = clienteId;

  const dispositivo = await dispositivoRepo.buscarPorUuid(uuid);
  if (!dispositivo) {
    console.error(`[MQTT] Conexión rechazada: dispositivo con UUID "${uuid}" no encontrado`);
    return;
  }

  // Obtener estado actual o crear uno por defecto
  const estadoActual = await redisRepositorio.obtenerEstadoDispositivo(uuid);
  const nuevoEstado: EstadoDispositivoRedis = estadoActual
    ? { ...estadoActual, estadoConexion: 'conectado' }
    : crearEstadoPorDefecto();

  await redisRepositorio.guardarEstadoDispositivo(uuid, nuevoEstado);

  // Emitir evento al propietario
  emitirAUsuario(dispositivo.id_usuario, 'dispositivo:estado', {
    dispositivoId: dispositivo.id,
    estadoConexion: 'conectado',
  });
}

/**
 * Manejador de desconexión MQTT de un dispositivo.
 *
 * Flujo:
 * 1. Extraer UUID del clientId
 * 2. Verificar que el dispositivo existe en la base de datos
 * 3. Actualizar estado en Redis con estadoConexion = "desconectado"
 * 4. Emitir evento "dispositivo:estado" al propietario vía Socket.io
 *
 * @param clienteId - ID del cliente MQTT (UUID del dispositivo)
 */
export async function onDesconexion(clienteId: string): Promise<void> {
  const uuid = clienteId;

  const dispositivo = await dispositivoRepo.buscarPorUuid(uuid);
  if (!dispositivo) {
    console.error(`[MQTT] Desconexión: dispositivo con UUID "${uuid}" no encontrado`);
    return;
  }

  // Obtener estado actual o crear uno por defecto con desconectado
  const estadoActual = await redisRepositorio.obtenerEstadoDispositivo(uuid);
  const nuevoEstado: EstadoDispositivoRedis = estadoActual
    ? { ...estadoActual, estadoConexion: 'desconectado' }
    : { ...crearEstadoPorDefecto(), estadoConexion: 'desconectado' };

  await redisRepositorio.guardarEstadoDispositivo(uuid, nuevoEstado);

  // Emitir evento al propietario
  emitirAUsuario(dispositivo.id_usuario, 'dispositivo:estado', {
    dispositivoId: dispositivo.id,
    estadoConexion: 'desconectado',
  });
}

/**
 * Interfaz para el mensaje de localización esperado.
 */
interface MensajeLocalizacion {
  latitud: number;
  longitud: number;
  altitud: number;
}

/**
 * Valida que el mensaje de localización tenga los campos correctos y valores válidos.
 *
 * @param datos - Objeto parseado del mensaje MQTT
 * @returns true si el mensaje es válido, false en caso contrario
 */
function validarMensajeLocalizacion(datos: unknown): datos is MensajeLocalizacion {
  if (typeof datos !== 'object' || datos === null) {
    return false;
  }

  const msg = datos as Record<string, unknown>;

  if (typeof msg.latitud !== 'number' || typeof msg.longitud !== 'number' || typeof msg.altitud !== 'number') {
    return false;
  }

  if (isNaN(msg.latitud) || isNaN(msg.longitud) || isNaN(msg.altitud)) {
    return false;
  }

  // Validar rangos geográficos
  if (msg.latitud < -90 || msg.latitud > 90) {
    return false;
  }

  if (msg.longitud < -180 || msg.longitud > 180) {
    return false;
  }

  return true;
}

/**
 * Extrae el UUID del topic MQTT.
 * Formato esperado: "dispositivos/{uuid}/localizacion"
 *
 * @param topic - Topic MQTT recibido
 * @returns UUID extraído o null si el formato es inválido
 */
function extraerUuidDeTopic(topic: string): string | null {
  const partes = topic.split('/');
  if (partes.length !== 3 || partes[0] !== 'dispositivos' || partes[2] !== 'localizacion') {
    return null;
  }
  return partes[1] || null;
}

/**
 * Manejador de publicación MQTT (mensaje recibido en un topic).
 *
 * Flujo:
 * 1. Parsear topic para extraer UUID del dispositivo
 * 2. Parsear mensaje como JSON
 * 3. Validar campos (latitud, longitud, altitud) con rangos correctos
 * 4. Delegar al servicio de localización
 * 5. Emitir evento "localizacion:actualizada" al propietario vía Socket.io
 *
 * @param topic - Topic MQTT (formato: "dispositivos/{uuid}/localizacion")
 * @param mensaje - Buffer con el mensaje JSON
 */
export async function onPublicacion(topic: string, mensaje: Buffer): Promise<void> {
  // 1. Parsear topic
  const uuid = extraerUuidDeTopic(topic);
  if (!uuid) {
    console.error(`[MQTT] Topic inválido: "${topic}"`);
    return;
  }

  // 2. Parsear mensaje JSON
  let datos: unknown;
  try {
    datos = JSON.parse(mensaje.toString());
  } catch {
    console.error(`[MQTT] Mensaje no es JSON válido en topic "${topic}"`);
    return;
  }

  // 3. Validar campos
  if (!validarMensajeLocalizacion(datos)) {
    console.error(`[MQTT] Mensaje de localización inválido en topic "${topic}": campos ausentes, tipos incorrectos o valores fuera de rango`);
    return;
  }

  // 4. Delegar al servicio de localización
  await procesarLocalizacion(uuid, datos.latitud, datos.longitud, datos.altitud);

  // 5. Obtener propietario y emitir evento Socket.io
  const dispositivo = await dispositivoRepo.buscarPorUuid(uuid);
  if (!dispositivo) {
    return;
  }

  emitirAUsuario(dispositivo.id_usuario, 'localizacion:actualizada', {
    dispositivoId: dispositivo.id,
    latitud: datos.latitud,
    longitud: datos.longitud,
    altitud: datos.altitud,
    timestamp: Date.now(),
  });
}
