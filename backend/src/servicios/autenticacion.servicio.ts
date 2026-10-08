import bcrypt from 'bcrypt';
import * as usuarioRepo from '../repositorios/base-datos/usuario.repositorio';
import * as administradorRepo from '../repositorios/base-datos/administrador.repositorio';
import { enviarCorreoRecuperacion, enviarCorreoBienvenida, enviarCorreoConfirmacion } from './correo.servicio';
import { ErrorHttp } from '../interceptores/error.middleware';
import { crear as crearEvento } from '../repositorios/base-datos/evento.repositorio'
import { crearLlaveRecuperacion, crearSesion, eliminarLlaveRecuperacion, obtenerLlaveRecuperacion, SesionRedis } from '@/repositorios/redis/sesiones.redis';
import {
  crearPreUsuario,
  obtenerPreUsuarioPorClave,
  eliminarPreUsuario,
  obtenerPreUsuarioPorIdentificador,
  PreUsuarioRedis
} from '@/repositorios/redis/pre-usuarios.redis';
import { obtenerDatosPreCambioPorCodigo } from '@/repositorios/redis/pre-cambios.redis';

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

/**
 * Genera una contraseña provisional combinando el alias del usuario,
 * caracteres especiales y números aleatorios, sin superar 10 caracteres.
 */
function generarContrasenaProvisional(alias: string): string {
  const especiales = '!@#$%&*?';
  const especial = especiales.charAt(
    Math.floor(Math.random() * especiales.length)
  );

  // Base: alias limpio (solo letras/números), capitalizado.
  const base = alias.replace(/[^a-zA-Z0-9]/g, '');
  const inicio = base
    ? base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
    : 'User';

  // Completar con números aleatorios hasta llegar a 10 caracteres
  // (1 carácter se reserva para el especial).
  const longitudBase = Math.min(inicio.length, 9 - 1);
  let resultado = inicio.slice(0, longitudBase) + especial;

  while (resultado.length < 10) {
    resultado += Math.floor(Math.random() * 10).toString();
  }

  return resultado.slice(0, 10);
}

/**
 * Valida que ni la base de datos ni los pre-usuarios en Redis tengan ya
 * registrado el alias, correo o teléfono indicado.
 */
async function validarNoDuplicado(
  alias: string,
  direccionCorreoElectronico: string,
  telefono: string
): Promise<void> {

  const comprobaciones: Array<[string, string]> = [
    [alias, 'El alias ya está registrado. Intente con otro.'],
    [direccionCorreoElectronico, 'La dirección de correo electrónico ya está registrada.'],
    [telefono, 'El número de teléfono ya está registrado.']
  ];

  for (const [valor, mensaje] of comprobaciones) {
    const enBaseDatos = await usuarioRepo.buscarExistentePorIdentificador(valor);
    const enRedis = await obtenerPreUsuarioPorIdentificador(valor);
    if (enBaseDatos || enRedis) {
      throw new ErrorHttp(409, mensaje);
    }
  }
}

/**
 * Registra un pre-usuario: valida que no exista duplicado, lo guarda
 * temporalmente en Redis (24 h) y envía por correo una clave (UUID)
 * de confirmación. El usuario aún NO se crea en la base de datos.
 */
export async function crear(datos: any): Promise<void> {

  const alias = String(datos.alias ?? '').trim();
  const direccionCorreoElectronico = String(datos.direccionCorreoElectronico ?? '').trim();
  const telefono = String(datos.telefono ?? '').trim();

  if (!alias || !direccionCorreoElectronico || !telefono) {
    throw new ErrorHttp(400, 'Alias, correo electrónico y teléfono son obligatorios.');
  }

  await validarNoDuplicado(alias, direccionCorreoElectronico, telefono);

  const clave = await crearPreUsuario({
    alias,
    direccionCorreoElectronico,
    telefono
  });


  await enviarCorreoConfirmacion(direccionCorreoElectronico, clave);
}

/**
 * Confirma un registro mediante la clave (UUID) recibida por correo.
 * Si la clave es válida y vigente, crea el usuario en la base de datos
 * con una contraseña provisional y envía el correo de bienvenida.
 */
export async function confirmar(clave: string): Promise<void> {

  const preUsuario = await obtenerPreUsuarioPorClave(clave);

  if (!preUsuario) {
    throw new ErrorHttp(400, 'El enlace de confirmación es inválido o ha expirado.');
  }

  // Revalidar que no se haya registrado el mismo dato mientras tanto.
  const aliasEnBd = await usuarioRepo.buscarExistentePorIdentificador(preUsuario.alias);
  const correoEnBd = await usuarioRepo.buscarExistentePorIdentificador(preUsuario.direccionCorreoElectronico);
  const telefonoEnBd = await usuarioRepo.buscarExistentePorIdentificador(preUsuario.telefono);
  if (aliasEnBd || correoEnBd || telefonoEnBd) {
    await eliminarPreUsuario(clave);
    throw new ErrorHttp(409, 'Los datos ya fueron registrados por otra cuenta.');
  }

  const contrasenaProvisional = generarContrasenaProvisional(preUsuario.alias);

  await usuarioRepo.crearUsuario({
    alias: preUsuario.alias,
    direccionCorreoElectronico: preUsuario.direccionCorreoElectronico,
    telefono: preUsuario.telefono,
    contrasena: contrasenaProvisional
  });

  await eliminarPreUsuario(clave);

  await enviarCorreoBienvenida({
    alias: preUsuario.alias,
    telefono: preUsuario.telefono,
    direccionCorreoElectronico: preUsuario.direccionCorreoElectronico,
    contrasena: contrasenaProvisional
  });
}

/**
/**
 * Autentica un usuario por alias o correo + contraseña.
 *
 * Si la contraseña coincide en plano → es provisional, debe cambiarla.
 * Si coincide con bcrypt → sesión normal.
 */
export async function autenticar(identificador: string, contrasena: string): Promise<any> {

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

    const sesion = await crearSesion(usuario.clave, usuario.direccionCorreoElectronico, usuario.alias, usuario.id, usuario.telefono);

    await crearEvento('Inicio sesión.')
    return {
      sesion: {
        clave: sesion.clave,
        claveUsuario: sesion.claveUsuario,
        alias: sesion.alias,
        direccionCorreoElectronico: sesion.direccionCorreoElectronico,
        telefono: sesion.telefono
      },
      requiereCambioContrasena: false
    };
  } else {
    // Contraseña plana (provisional) — comparar directamente
    if (contrasena !== usuario.contrasena) {
      throw new ErrorHttp(400, 'Credenciales inválidas');
    }
    await crearEvento('Inicio sesión pero requiere cambiar su contraseña.')
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
    const claveLLaveRecuperacion = await crearLlaveRecuperacion(usuario.id, 'R');
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
 */
export async function cambiarContrasena(llave: string, nuevaContrasena: string): Promise<void> {
  const recuperacion = await obtenerLlaveRecuperacion(llave);

  if (!recuperacion) {
    throw new ErrorHttp(400, 'Enlace inválido o expirado');
  }

  const contrasenaHash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);

  // El administrador usa idUsuario negativo (-administrador.id).
  // En ese caso se actualiza la tabla de administradores.
  if (recuperacion.idUsuario < 0) {
    await administradorRepo.actualizarContrasena(
      Math.abs(recuperacion.idUsuario),
      contrasenaHash
    );
  } else {
    await usuarioRepo.actualizarContrasena(recuperacion.idUsuario, contrasenaHash);
  }

  await eliminarLlaveRecuperacion(llave);
}


/**
 *Verifica que el codigo exista y regresa los datos del pre usuario para su evaluación
 */
export async function verificarCodigo(codigo: string): Promise<PreUsuarioRedis> {
  const preUsuario = await obtenerPreUsuarioPorClave(codigo);

  if (!preUsuario) {
    throw new ErrorHttp(400, 'El código de verificación no existe o ha caducado.');
  }

  return preUsuario
}


export async function verificarCodigoPreCambio(codigo: string): Promise<any | null> {

  const datos = await obtenerDatosPreCambioPorCodigo(codigo);

  if (!datos) {
    throw new ErrorHttp(400, 'El código de verificación no existe o ha caducado.');
  }

  return datos
}