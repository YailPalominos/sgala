import { ErrorHttp } from '../interceptores/error.middleware';
import { buscarPorClave } from '../repositorios/dispositivo.repositorio';

/**
 * Valida que la clave del dispositivo exista y no esté vinculada.
 */
export async function validarClave(clave: string, idUsuario: number): Promise<any> {
  let datosDispositivo;
  try {
    datosDispositivo = await buscarPorClave(clave,idUsuario);
  } catch {
    throw new ErrorHttp(400, 'Clave de dispositivo inválida.')
  }
  if (datosDispositivo == null) {
    return null;
  }
  return datosDispositivo;
}