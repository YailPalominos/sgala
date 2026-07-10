import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import * as localizacionRepo from '../repositorios/localizacion.repositorio';
import { redisRepositorio, EstadoDispositivoRedis } from '../repositorios/redis.repositorio';
import { calcularDistanciaHaversine } from '../utilidades/distancia.util';

/**
 * Umbral mínimo de distancia (en metros) para persistir una nueva localización en BD.
 */
const UMBRAL_DISTANCIA_METROS = 50;

/**
 * Interfaz de localización retornada por el servicio.
 */
export interface LocalizacionResultado {
  latitud: number;
  longitud: number;
  altitud: number;
}

/**
 * Procesa una nueva localización recibida desde un dispositivo.
 *
 * Flujo:
 * 1. Buscar dispositivo por UUID
 * 2. Actualizar estado en Redis con la nueva localización
 * 3. Obtener última localización persistida en BD
 * 4. Si no hay localización previa → insertar (primera localización)
 * 5. Si hay previa → calcular distancia Haversine → si >= 50m → insertar
 * 6. Si < 50m → no insertar (solo Redis fue actualizado)
 *
 * @param uuidDispositivo - UUID del dispositivo que reporta localización
 * @param latitud - Latitud en grados decimales
 * @param longitud - Longitud en grados decimales
 * @param altitud - Altitud en metros
 */
export async function procesarLocalizacion(
  uuidDispositivo: string,
  latitud: number,
  longitud: number,
  altitud: number
): Promise<void> {
  // 1. Buscar dispositivo por UUID
  const dispositivo = await dispositivoRepo.buscarPorUuid(uuidDispositivo);
  if (!dispositivo) {
    return;
  }

  // 2. Actualizar estado en Redis con la nueva localización
  const estadoActual = await redisRepositorio.obtenerEstadoDispositivo(uuidDispositivo);
  const nuevoEstado: EstadoDispositivoRedis = {
    estadoConexion: estadoActual?.estadoConexion ?? 'conectado',
    localizacion: { latitud, longitud, altitud },
    estado: estadoActual?.estado ?? '',
    alarma: estadoActual?.alarma ?? '',
    estadoDirecto: estadoActual?.estadoDirecto ?? '',
  };
  await redisRepositorio.guardarEstadoDispositivo(uuidDispositivo, nuevoEstado);

  // 3. Obtener última localización persistida en BD
  const ultimaLocalizacion = await localizacionRepo.obtenerUltima(dispositivo.id);

  // 4. Si no hay localización previa → insertar (primera localización)
  if (!ultimaLocalizacion) {
    await localizacionRepo.insertar(dispositivo.id, latitud, longitud, altitud);
    return;
  }

  // 5. Calcular distancia Haversine
  const distancia = calcularDistanciaHaversine(
    ultimaLocalizacion.latitud,
    ultimaLocalizacion.longitud,
    latitud,
    longitud
  );

  // 6. Si >= 50m → insertar en BD
  if (distancia >= UMBRAL_DISTANCIA_METROS) {
    await localizacionRepo.insertar(dispositivo.id, latitud, longitud, altitud);
  }
  // Si < 50m → no insertar (solo Redis fue actualizado)
}

/**
 * Obtiene la última localización conocida de un dispositivo.
 * Prioridad: Redis → SQL Server → null
 *
 * Flujo:
 * 1. Buscar dispositivo por ID para obtener UUID
 * 2. Consultar Redis por estado del dispositivo
 * 3. Si Redis tiene localización, retornarla
 * 4. Si no hay en Redis → consultar BD
 * 5. Si no hay en BD → retornar null
 *
 * @param idDispositivo - ID numérico del dispositivo
 * @returns Última localización o null si no existe
 */
export async function obtenerUltimaLocalizacion(
  idDispositivo: number
): Promise<LocalizacionResultado | null> {
  // 1. Buscar dispositivo por ID para obtener UUID
  const dispositivo = await dispositivoRepo.buscarPorId(idDispositivo);
  if (!dispositivo) {
    return null;
  }

  // 2. Consultar Redis por estado del dispositivo
  const estadoRedis = await redisRepositorio.obtenerEstadoDispositivo(dispositivo.uuid);

  // 3. Si Redis tiene localización, retornarla
  if (estadoRedis?.localizacion) {
    return {
      latitud: estadoRedis.localizacion.latitud,
      longitud: estadoRedis.localizacion.longitud,
      altitud: estadoRedis.localizacion.altitud,
    };
  }

  // 4. Si no hay en Redis → consultar BD
  const ultimaBD = await localizacionRepo.obtenerUltima(idDispositivo);
  if (ultimaBD) {
    return {
      latitud: ultimaBD.latitud,
      longitud: ultimaBD.longitud,
      altitud: ultimaBD.altitud,
    };
  }

  // 5. Si no hay en BD → retornar null
  return null;
}
