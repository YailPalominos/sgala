import bcrypt from 'bcrypt';
import * as usuarioRepo from '../repositorios/usuario.repositorio';
import { redisRepositorio, SesionRedis } from '../repositorios/redis.repositorio';
import { enviarCorreoRecuperacion, enviarCorreoBienvenida } from './correo.servicio';
import { sesionServicio } from './sesion.servicio';
import { ErrorHttp } from '../interceptores/error.middleware';

export interface DatosUsuarioRegistro {
  clave: string;
  alias: string;
  direccionCorreoElectronico: string;
}

export interface LoginResultado {
  idUsuario?: number;
  sesion?: SesionRedis;
  requiereCambioContrasena: boolean;
}

const SALT_ROUNDS = 10;

function generarContrasenaProvisional(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let resultado = '';
  for (let i = 0; i < 10; i++) {
    resultado += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return resultado;
}

/**
 * Valida que la clave del dispositivo exista y no esté vinculada.
 */
export async function validarClave(clave: string): Promise<any> {
  let datosUsuario;
  try {
    datosUsuario = await usuarioRepo.buscarPorClave(clave);
  } catch {
    throw new ErrorHttp(400, 'Clave de usuario inválida.')
  }
  if (datosUsuario == null) {
    return null;
  }
  return datosUsuario;
}

/**
 * Crear un nuevo usuario.
 */
export async function crear(datos: any): Promise<void> {

  const aliasExistente = await usuarioRepo.buscarExistentePorIdentificador(datos.alias);
  if (aliasExistente) {
    throw new ErrorHttp(409, 'El alias ya está registrado "Intente con otro"');
  }

  const correoExistente = await usuarioRepo.buscarExistentePorIdentificador(datos.direccionCorreoElectronico);
  if (correoExistente) {
    throw new ErrorHttp(409, 'La dirección de correo electrónico ya está registrada');
  }

  const telefonoExistente = await usuarioRepo.buscarExistentePorIdentificador(datos.telefono);
  if (telefonoExistente) {
    throw new ErrorHttp(409, 'El número de teléfono ya está registrado');
  }

  const contrasenaProvisional = generarContrasenaProvisional();

  datos.contrasena = contrasenaProvisional
  datos.idPreUsuario = await usuarioRepo.obtenerIdPreUsuarioPorClave(datos.clave)

  await usuarioRepo.crearUsuario(datos);

  await enviarCorreoBienvenida(datos);
}

/**
/**
 * Autentica un usuario por alias o correo + contraseña.
 *
 * Si la contraseña coincide en plano → es provisional, debe cambiarla.
 * Si coincide con bcrypt → sesión normal.
 */
export async function autenticar(identificador: string, contrasena: string): Promise<LoginResultado> {

  let usuario
  try {
    usuario = await usuarioRepo.buscarPorIdentificador(identificador);
  } catch (error: any) {

    if (error.message === 'Usuario no encontrado.') {
      throw new ErrorHttp(
        404,
        error.message
      );
    }

    if (error.message === 'Usuario inactivo contacte al administrador.') {
      throw new ErrorHttp(
        403,
        error.message
      );
    }

    throw new ErrorHttp(
      500,
      'Error interno al consultar usuario'
    );
  }

  // Detectar si la contraseña almacenada es un hash bcrypt
  const esBcrypt = /^\$2[aby]?\$\d{1,2}\$.{53}$/.test(usuario.contrasena);

  if (esBcrypt) {
    // Contraseña cifrada — verificar con bcrypt
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new ErrorHttp(400, 'Credenciales inválidas');
    }
    const sesion = await sesionServicio.crearSesion(usuario.direccionCorreoElectronico, usuario.alias, usuario.id, usuario.telefono);
    return { sesion, requiereCambioContrasena: false };
  } else {
    // Contraseña plana (provisional) — comparar directamente
    if (contrasena !== usuario.contrasena) {
      throw new ErrorHttp(400, 'Credenciales inválidas');
    }
    return { idUsuario: usuario.id, requiereCambioContrasena: true };
  }

}

/**
 * Verifica que la identidad
 */
export async function verificarIdentidad(identificador: string): Promise<any> {
  try {
    const usuario = await usuarioRepo.buscarPorIdentificador(identificador);
    return { telefono: usuario.telefono, direccionCorreoElectronico: usuario.direccionCorreoElectronico }
  } catch {
    throw new ErrorHttp(404, 'No existe un usuario con el identificador proporcionado.');
  }
}

/**
 * Solicita recuperación de contraseña.
 */
export async function solicitarRecuperacion(identificador: string, tipo: string): Promise<void> {
  let usuario
  try {
    usuario = await usuarioRepo.buscarPorIdentificador(identificador);
  } catch (error: any) {
    throw new ErrorHttp(401, error);
  }
  try {
    const claveLLaveRecuperacion = await redisRepositorio.crearLlaveRecuperacion(usuario.id, 'R');
    // if (tipo == 'C') {
    await enviarCorreoRecuperacion(usuario.direccionCorreoElectronico, claveLLaveRecuperacion);
    // }
    // if (tipo == 'T') {
    // }
  }
  catch (error) {
    throw error;
  }
}

/**
 * Cambia la contraseña usando una llave de recuperación.
 * Actualiza estatus a 1 (activo normal).
 */
export async function cambiarContrasena(llave: string, nuevaContrasena: string): Promise<void> {
  const recuperacion = await redisRepositorio.obtenerLlaveRecuperacion(llave);

  if (!recuperacion) {
    throw new ErrorHttp(400, 'Enlace inválido o expirado');
  }

  const contrasenaHash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);

  await usuarioRepo.actualizarContrasena(recuperacion.idUsuario, contrasenaHash);
  await redisRepositorio.eliminarLlaveRecuperacion(llave);
}
