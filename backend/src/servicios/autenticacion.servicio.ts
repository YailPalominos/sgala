import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ErrorHttp } from '../utilidades/error-http';
import * as preDispositivoRepo from '../repositorios/pre-dispositivo.repositorio';
import * as usuarioRepo from '../repositorios/usuario.repositorio';
import * as dispositivoRepo from '../repositorios/dispositivo.repositorio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import { enviarCorreoRecuperacion } from './correo.servicio';
import { sesionServicio } from './sesion.servicio';

/**
 * Datos requeridos para registrar un nuevo usuario.
 */
export interface RegistroRequest {
  uuidPreDispositivo: string;
  alias: string;
  correo: string;
  contrasena: string;
  telefono: string;
}

/**
 * Resultado exitoso del registro.
 */
export interface RegistroResultado {
  usuario: usuarioRepo.Usuario;
  dispositivo: dispositivoRepo.Dispositivo;
}

const SALT_ROUNDS = 10;

/**
 * Registra un nuevo usuario en el sistema.
 *
 * Flujo:
 * 1. Validar campos requeridos
 * 2. Verificar pre-dispositivo (existe y no vinculado)
 * 3. Verificar unicidad de alias y correo
 * 4. Cifrar contraseña con bcrypt (10 salt rounds)
 * 5. Insertar usuario con estatus=1
 * 6. Crear dispositivo vinculando usuario + pre-dispositivo + teléfono
 */
export async function registrar(datos: RegistroRequest): Promise<RegistroResultado> {
  // 1. Validar campos requeridos
  const camposFaltantes: string[] = [];
  if (!datos.uuidPreDispositivo?.trim()) camposFaltantes.push('uuidPreDispositivo');
  if (!datos.alias?.trim()) camposFaltantes.push('alias');
  if (!datos.correo?.trim()) camposFaltantes.push('correo');
  if (!datos.contrasena?.trim()) camposFaltantes.push('contrasena');
  if (!datos.telefono?.trim()) camposFaltantes.push('telefono');

  if (camposFaltantes.length > 0) {
    throw new ErrorHttp(400, `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`);
  }

  // 2. Verificar pre-dispositivo
  const preDispositivo = await preDispositivoRepo.buscarPorUuid(datos.uuidPreDispositivo);
  if (!preDispositivo) {
    throw new ErrorHttp(400, 'El UUID de pre-dispositivo no existe');
  }

  const vinculado = await preDispositivoRepo.estaVinculado(preDispositivo.id);
  if (vinculado) {
    throw new ErrorHttp(400, 'El pre-dispositivo ya está vinculado a un dispositivo');
  }

  // 3. Verificar unicidad de alias y correo
  const aliasExistente = await usuarioRepo.buscarPorAlias(datos.alias);
  if (aliasExistente) {
    throw new ErrorHttp(409, 'El alias ya está registrado');
  }

  const correoExistente = await usuarioRepo.buscarPorCorreo(datos.correo);
  if (correoExistente) {
    throw new ErrorHttp(409, 'El correo electrónico ya está registrado');
  }

  // 4. Cifrar contraseña con bcrypt
  const contrasenaHash = await bcrypt.hash(datos.contrasena, SALT_ROUNDS);

  // 5. Insertar usuario con estatus=1
  const usuario = await usuarioRepo.crearUsuario({
    alias: datos.alias,
    correo: datos.correo,
    contrasena: contrasenaHash,
  });

  // 6. Crear dispositivo vinculando usuario + pre-dispositivo + teléfono
  const dispositivo = await dispositivoRepo.crearDispositivo({
    id_usuario: usuario.id,
    id_pre_dispositivo: preDispositivo.id,
    telefono: datos.telefono,
  });

  return { usuario, dispositivo };
}


const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

/**
 * Inicia sesión para un usuario registrado.
 *
 * Flujo:
 * 1. Buscar usuario por alias
 * 2. Verificar estatus = 1
 * 3. Comparar contraseña con bcrypt
 * 4. Crear sesión en Redis
 * 5. Retornar sessionId
 *
 * Lanza ErrorHttp(401) con mensaje genérico idéntico en todos los casos de fallo
 * para no revelar información sobre qué campo es incorrecto.
 */
export async function login(alias: string, contrasena: string): Promise<string> {
  // 1. Buscar usuario por alias
  const usuario = await usuarioRepo.buscarPorAlias(alias);

  // 2. Si no existe, lanzar 401
  if (!usuario) {
    throw new ErrorHttp(401, MENSAJE_CREDENCIALES_INVALIDAS);
  }

  // 3. Verificar estatus = 1
  if (usuario.estatus !== 1) {
    throw new ErrorHttp(401, MENSAJE_CREDENCIALES_INVALIDAS);
  }

  // 4. Comparar contraseña con bcrypt
  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
  if (!contrasenaValida) {
    throw new ErrorHttp(401, MENSAJE_CREDENCIALES_INVALIDAS);
  }

  // 5. Crear sesión y retornar sessionId
  const sessionId = await sesionServicio.crearSesion(usuario.id, usuario.alias);
  return sessionId;
}


/**
 * Solicita recuperación de contraseña.
 *
 * Flujo:
 * 1. Buscar usuario por correo
 * 2. Si no existe, retornar sin error (anti-enumeración)
 * 3. Generar llave UUID
 * 4. Guardar llave en Redis con TTL de 180s
 * 5. Enviar correo con enlace de recuperación
 * 6. Si falla el envío, eliminar llave y lanzar ErrorHttp(500)
 */
export async function solicitarRecuperacion(correo: string): Promise<void> {
  // 1. Buscar usuario por correo
  const usuario = await usuarioRepo.buscarPorCorreo(correo);

  // 2. Si no existe, retornar silenciosamente (anti-enumeración)
  if (!usuario) {
    return;
  }

  // 3. Generar llave UUID
  const llave = uuidv4();

  // 4. Guardar llave en Redis con TTL de 180 segundos
  await redisRepositorio.guardarLlaveRecuperacion(llave, usuario.id, 180);

  // 5. Enviar correo con enlace de recuperación
  try {
    await enviarCorreoRecuperacion(correo, llave);
  } catch {
    // 6. Si falla el envío, eliminar llave y lanzar error
    await redisRepositorio.eliminarLlaveRecuperacion(llave);
    throw new ErrorHttp(500, 'Error al enviar correo de recuperación');
  }
}

/**
 * Cambia la contraseña usando una llave de recuperación.
 *
 * Flujo:
 * 1. Verificar llave en Redis
 * 2. Si no existe, lanzar ErrorHttp(400)
 * 3. Cifrar nueva contraseña con bcrypt (10 rounds)
 * 4. Actualizar contraseña en BD
 * 5. Eliminar llave de Redis
 */
export async function cambiarContrasena(llave: string, nuevaContrasena: string): Promise<void> {
  // 1. Verificar llave en Redis
  const recuperacion = await redisRepositorio.obtenerLlaveRecuperacion(llave);

  // 2. Si no existe, lanzar ErrorHttp(400)
  if (!recuperacion) {
    throw new ErrorHttp(400, 'Enlace inválido o expirado');
  }

  // 3. Cifrar nueva contraseña con bcrypt (10 rounds)
  const contrasenaHash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);

  // 4. Actualizar contraseña en BD
  await usuarioRepo.actualizarContrasena(recuperacion.idUsuario, contrasenaHash);

  // 5. Eliminar llave de Redis
  await redisRepositorio.eliminarLlaveRecuperacion(llave);
}
