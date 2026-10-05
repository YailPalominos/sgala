import { Router, Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import * as administradorRepositorio from '../repositorios/base-datos/administrador.repositorio';
import * as eventoAdministradorRepositorio from '../repositorios/base-datos/evento-administrador.repositorio';
import {
  crearPreDispositivo,
  obtenerListaAdministrativa
} from '../repositorios/base-datos/dispositivo.repositorio';
import { obtenerListaAdministrativa as obtenerListaUsuarios } from '../repositorios/base-datos/usuario.repositorio';
import { obtenerListaAdministrativa as obtenerListaEventos } from '../repositorios/base-datos/evento.repositorio';
import { ErrorHttp } from '../interceptores/error.middleware';
import {
  actualizarPerfilSesion,
  crearSesion,
  eliminarSesion
} from '@/repositorios/redis/sesiones.redis';

export const administradorRouter = Router();

const saltRounds = 10;

function requiereAdministrador(
  solicitud: Request,
  _: Response,
  siguiente: NextFunction
): void {
  if (solicitud.sesion.tipoCuenta !== 'administrador') {
    siguiente(new ErrorHttp(403, 'Se requiere una sesión de administrador.'));
    return;
  }
  siguiente();
}

function validarDatosAdministrador(datos: Record<string, unknown>): void {
  const camposRequeridos = [
    'nombres',
    'apellidos',
    'direccionCorreoElectronico',
    'alias'
  ];
  if (camposRequeridos.some((campo) => typeof datos[campo] !== 'string' || !datos[campo])) {
    throw new ErrorHttp(400, 'Faltan campos requeridos del administrador.');
  }
  if ((datos.alias as string).length > 15 ||
    (datos.nombres as string).length > 50 ||
    (datos.apellidos as string).length > 50 ||
    (datos.direccionCorreoElectronico as string).length > 100) {
    throw new ErrorHttp(400, 'Uno o más campos superan la longitud permitida.');
  }
  if (
    datos.permisos !== undefined &&
    datos.permisos !== null &&
    (typeof datos.permisos !== 'string' || datos.permisos.length > 500)
  ) {
    throw new ErrorHttp(400, 'Los permisos deben ser texto de hasta 500 caracteres o null.');
  }
}

administradorRouter.post(
  '/autenticar',
  asyncHandler(async (solicitud, respuesta) => {
    if (
      solicitud.body === null ||
      typeof solicitud.body !== 'object' ||
      Array.isArray(solicitud.body)
    ) {
      throw new ErrorHttp(400, 'Las credenciales no son válidas.');
    }
    const { identificador, contraseña } = solicitud.body;
    if (typeof identificador !== 'string' || typeof contraseña !== 'string') {
      throw new ErrorHttp(400, 'Identificador y contraseña son requeridos.');
    }

    const administrador = await administradorRepositorio.buscarPorIdentificador(identificador);

    if (!administrador || !administrador.estatus) {
      throw new ErrorHttp(401, 'Credenciales inválidas.');
    }

    const esBcrypt = /^\$2[aby]?\$\d{1,2}\$.{53}$/.test(administrador.contrasena);
    const contrasenaValida = esBcrypt
      ? await bcrypt.compare(contraseña, administrador.contrasena)
      : contraseña === administrador.contrasena;
    if (!contrasenaValida) {
      throw new ErrorHttp(401, 'Credenciales inválidas.');
    }

    const sesion = await crearSesion(
      `administrador:${administrador.id}`,
      administrador.direccionCorreoElectronico,
      administrador.alias,
      -administrador.id,
      '',
      'administrador'
    );
    await eventoAdministradorRepositorio.registrar(
      administrador.id,
      'Inició sesión como administrador.'
    );
    respuesta.status(200).json({
      datos: sesion,
      mensaje: 'Autenticación de administrador exitosa.'
    });
  })
);

administradorRouter.use(requiereAdministrador);

administradorRouter.get(
  '/dispositivos/obtener-lista',
  asyncHandler(async (_solicitud, respuesta) => {
    const datos = await obtenerListaAdministrativa();
    respuesta.status(200).json({
      datos,
      mensaje: 'Dispositivos obtenidos exitosamente.'
    });
  })
);

administradorRouter.post(
  '/pre-dispositivos/crear',
  asyncHandler(async (solicitud, respuesta) => {
    if (!solicitud.body || typeof solicitud.body !== 'object' || Array.isArray(solicitud.body)) {
      throw new ErrorHttp(400, 'Los datos del pre-dispositivo no son válidos.');
    }
    const { tipo, cualidades } = solicitud.body;
    if (
      typeof tipo !== 'string' ||
      !['I', 'T', 'C', 'D'].includes(tipo)
    ) {
      throw new ErrorHttp(400, 'Selecciona un tipo válido de pre-dispositivo.');
    }
    if (
      cualidades !== undefined &&
      cualidades !== null &&
      (typeof cualidades !== 'string' || cualidades.length > 100)
    ) {
      throw new ErrorHttp(400, 'Las cualidades deben ser texto de hasta 100 caracteres o null.');
    }

    const datos = await crearPreDispositivo({
      tipo: tipo as 'I' | 'T' | 'C' | 'D',
      cualidades: typeof cualidades === 'string' && cualidades.trim()
        ? cualidades.trim()
        : null
    });
    await eventoAdministradorRepositorio.registrar(
      Math.abs(solicitud.sesion.idUsuario),
      `Creó un pre-dispositivo de tipo ${tipo}.`
    );
    respuesta.status(201).json({
      datos,
      mensaje: 'Pre-dispositivo creado exitosamente.'
    });
  })
);

administradorRouter.get(
  '/usuarios/obtener-lista',
  asyncHandler(async (_solicitud, respuesta) => {
    const datos = await obtenerListaUsuarios();
    respuesta.status(200).json({
      datos,
      mensaje: 'Usuarios obtenidos exitosamente.'
    });
  })
);

administradorRouter.get(
  '/eventos/obtener-lista',
  asyncHandler(async (_solicitud, respuesta) => {
    const datos = await obtenerListaEventos();
    respuesta.status(200).json({
      datos,
      mensaje: 'Eventos obtenidos exitosamente.'
    });
  })
);

administradorRouter.get(
  '/eventos-administradores/obtener-lista',
  asyncHandler(async (_solicitud, respuesta) => {
    const datos = await eventoAdministradorRepositorio.obtenerLista();
    respuesta.status(200).json({
      datos,
      mensaje: 'Eventos de administradores obtenidos exitosamente.'
    });
  })
);

administradorRouter.get(
  '/perfil',
  asyncHandler(async (solicitud, respuesta) => {
    const datos = await administradorRepositorio.obtener(
      Math.abs(solicitud.sesion.idUsuario)
    );
    if (!datos) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }
    respuesta.status(200).json({
      datos,
      mensaje: 'Perfil de administrador obtenido exitosamente.'
    });
  })
);

administradorRouter.post(
  '/cerrar-sesion',
  asyncHandler(async (solicitud, respuesta) => {
    await eliminarSesion(solicitud.sesion.clave);
    respuesta.status(200).json({
      mensaje: 'Sesión de administrador cerrada exitosamente.'
    });
  })
);

administradorRouter.get(
  '/obtener-lista',
  asyncHandler(async (_solicitud, respuesta) => {
    const datos = await administradorRepositorio.obtenerLista();
    respuesta.status(200).json({
      datos,
      mensaje: 'Administradores obtenidos exitosamente.'
    });
  })
);

administradorRouter.get(
  '/obtener/:id',
  asyncHandler(async (solicitud, respuesta) => {
    const id = Number(solicitud.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new ErrorHttp(400, 'El identificador del administrador no es válido.');
    }
    const datos = await administradorRepositorio.obtener(id);
    if (!datos) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }
    respuesta.status(200).json({
      datos,
      mensaje: 'Administrador obtenido exitosamente.'
    });
  })
);

administradorRouter.post(
  '/crear',
  asyncHandler(async (solicitud, respuesta) => {
    if (
      solicitud.body === null ||
      typeof solicitud.body !== 'object' ||
      Array.isArray(solicitud.body)
    ) {
      throw new ErrorHttp(400, 'Los datos del administrador no son válidos.');
    }
    const datos = solicitud.body as Record<string, unknown>;
    validarDatosAdministrador(datos);
    if (typeof datos.contrasena !== 'string' || !datos.contrasena) {
      throw new ErrorHttp(400, 'La contraseña es requerida.');
    }
    if (datos.estatus !== undefined && typeof datos.estatus !== 'boolean') {
      throw new ErrorHttp(400, 'El estatus debe ser verdadero o falso.');
    }
    if (datos.contrasena.length > 255) {
      throw new ErrorHttp(400, 'La contraseña supera la longitud permitida.');
    }
    if (await administradorRepositorio.existeIdentificador(datos.alias as string) ||
      await administradorRepositorio.existeIdentificador(datos.direccionCorreoElectronico as string)) {
      throw new ErrorHttp(409, 'El alias o correo electrónico ya está registrado.');
    }

    const contrasena = await bcrypt.hash(datos.contrasena, saltRounds);
    const id = await administradorRepositorio.crear({
      nombres: datos.nombres as string,
      apellidos: datos.apellidos as string,
      direccionCorreoElectronico: datos.direccionCorreoElectronico as string,
      contrasena,
      estatus: datos.estatus !== false,
      alias: datos.alias as string,
      permisos: (datos.permisos as string | null | undefined) ?? null
    });
    await eventoAdministradorRepositorio.registrar(
      Math.abs(solicitud.sesion.idUsuario),
      `Creó el administrador ${datos.alias as string}.`
    );
    respuesta.status(201).json({
      datos: { id },
      mensaje: 'Administrador creado exitosamente.'
    });
  })
);

administradorRouter.put(
  '/actualizar',
  asyncHandler(async (solicitud, respuesta) => {
    if (
      solicitud.body === null ||
      typeof solicitud.body !== 'object' ||
      Array.isArray(solicitud.body)
    ) {
      throw new ErrorHttp(400, 'Los datos del administrador no son válidos.');
    }
    const datos = solicitud.body as Record<string, unknown>;
    const id = Number(datos.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new ErrorHttp(400, 'El identificador del administrador no es válido.');
    }
    validarDatosAdministrador(datos);
    if (typeof datos.estatus !== 'boolean') {
      throw new ErrorHttp(400, 'El estatus debe ser verdadero o falso.');
    }
    if (datos.contrasena !== undefined &&
      (typeof datos.contrasena !== 'string' || datos.contrasena.length > 255)) {
      throw new ErrorHttp(400, 'La contraseña debe ser texto de hasta 255 caracteres.');
    }
    const actual = await administradorRepositorio.obtenerConContrasena(id);
    if (!actual) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }
    if (await administradorRepositorio.existeIdentificador(datos.alias as string, id) ||
      await administradorRepositorio.existeIdentificador(datos.direccionCorreoElectronico as string, id)) {
      throw new ErrorHttp(409, 'El alias o correo electrónico ya está registrado.');
    }

    let contrasena: string;
    if (typeof datos.contrasena === 'string' && datos.contrasena) {
      contrasena = await bcrypt.hash(datos.contrasena, saltRounds);
    } else {
      contrasena = actual.contrasena;
    }

    const actualizado = await administradorRepositorio.actualizar({
      id,
      nombres: datos.nombres as string,
      apellidos: datos.apellidos as string,
      direccionCorreoElectronico: datos.direccionCorreoElectronico as string,
      contrasena,
      estatus: datos.estatus,
      alias: datos.alias as string,
      permisos: (datos.permisos as string | null | undefined) ?? null
    });
    if (!actualizado) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }
    await eventoAdministradorRepositorio.registrar(
      Math.abs(solicitud.sesion.idUsuario),
      `Actualizó el administrador ${datos.alias as string}.`
    );
    respuesta.status(200).json({
      mensaje: 'Administrador actualizado exitosamente.'
    });
  })
);

administradorRouter.put(
  '/perfil',
  asyncHandler(async (solicitud, respuesta) => {
    if (
      solicitud.body === null ||
      typeof solicitud.body !== 'object' ||
      Array.isArray(solicitud.body)
    ) {
      throw new ErrorHttp(400, 'Los datos del perfil no son válidos.');
    }
    const datos = solicitud.body as Record<string, unknown>;
    const id = Math.abs(solicitud.sesion.idUsuario);
    const actual = await administradorRepositorio.obtenerConContrasena(id);
    if (!actual) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }

    validarDatosAdministrador({
      ...datos,
      estatus: actual.estatus,
      permisos: actual.permisos
    });
    if (datos.contrasena !== undefined &&
      (typeof datos.contrasena !== 'string' || datos.contrasena.length > 255)) {
      throw new ErrorHttp(400, 'La contraseña debe ser texto de hasta 255 caracteres.');
    }
    if (await administradorRepositorio.existeIdentificador(datos.alias as string, id) ||
      await administradorRepositorio.existeIdentificador(datos.direccionCorreoElectronico as string, id)) {
      throw new ErrorHttp(409, 'El alias o correo electrónico ya está registrado.');
    }

    const contrasena = typeof datos.contrasena === 'string' && datos.contrasena
      ? await bcrypt.hash(datos.contrasena, saltRounds)
      : actual.contrasena;
    const actualizado = await administradorRepositorio.actualizar({
      id,
      nombres: datos.nombres as string,
      apellidos: datos.apellidos as string,
      direccionCorreoElectronico: datos.direccionCorreoElectronico as string,
      contrasena,
      estatus: actual.estatus,
      alias: datos.alias as string,
      permisos: actual.permisos
    });
    if (!actualizado) {
      throw new ErrorHttp(404, 'Administrador no encontrado.');
    }
    await eventoAdministradorRepositorio.registrar(id, 'Actualizó su perfil de administrador.');
    await actualizarPerfilSesion(solicitud.sesion.idUsuario, solicitud.sesion.clave, {
      alias: datos.alias as string,
      direccionCorreoElectronico: datos.direccionCorreoElectronico as string
    });
    respuesta.status(200).json({
      datos: {
        alias: datos.alias,
        direccionCorreoElectronico: datos.direccionCorreoElectronico
      },
      mensaje: 'Perfil de administrador actualizado exitosamente.'
    });
  })
);
