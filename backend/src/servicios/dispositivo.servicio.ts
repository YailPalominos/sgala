import * as dispositivoRepositorio from '../repositorios/dispositivo.repositorio';
import { obtenerUltimaLocalizacion, LocalizacionResultado } from './localizacion.servicio';
import { ErrorHttp } from '../utilidades/error-http';

/**
 * Interfaz de respuesta para cada dispositivo con su última localización.
 */
export interface DispositivoConLocalizacion {
  id: number;
  telefono: string;
  localizacion: LocalizacionResultado | null;
}

/**
 * Interfaz de respuesta para el enlace de Google Maps.
 */
export interface EnlaceMapaRespuesta {
  url: string;
}

/**
 * Lista todos los dispositivos de un usuario con su última localización.
 * Prioridad de localización: Redis → tabla `localizaciones` → null.
 *
 * Valida: Requisitos 7.1, 7.2, 7.3, 7.4
 */
export async function listarDispositivosPorUsuario(idUsuario: number): Promise<DispositivoConLocalizacion[]> {
  const dispositivos = await dispositivoRepositorio.listarPorUsuario(idUsuario);

  const resultado: DispositivoConLocalizacion[] = await Promise.all(
    dispositivos.map(async (dispositivo) => {
      const localizacion = await obtenerUltimaLocalizacion(dispositivo.id);

      return {
        id: dispositivo.id,
        telefono: dispositivo.telefono,
        localizacion,
      };
    })
  );

  return resultado;
}

/**
 * Obtiene la URL de Google Maps para la última localización de un dispositivo.
 * Verifica que el dispositivo pertenece al usuario autenticado.
 *
 * Valida: Requisitos 8.1, 8.2, 8.3
 *
 * @throws ErrorHttp(404) si el dispositivo no existe o no tiene localización
 * @throws ErrorHttp(403) si el dispositivo no pertenece al usuario
 */
export async function obtenerEnlaceMapa(idDispositivo: number, idUsuario: number): Promise<EnlaceMapaRespuesta> {
  const dispositivo = await dispositivoRepositorio.buscarPorId(idDispositivo);

  if (!dispositivo) {
    throw new ErrorHttp(404, 'Dispositivo no encontrado');
  }

  if (dispositivo.id_usuario !== idUsuario) {
    throw new ErrorHttp(403, 'No tienes acceso a este dispositivo');
  }

  const localizacion = await obtenerUltimaLocalizacion(idDispositivo);

  if (!localizacion) {
    throw new ErrorHttp(404, 'No hay localización disponible para el dispositivo');
  }

  const url = `https://www.google.com/maps?q=${localizacion.latitud},${localizacion.longitud}`;
  return { url };
}
