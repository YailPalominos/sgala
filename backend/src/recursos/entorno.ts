import dotenv from 'dotenv';
import { isIP } from 'net';
import { domainToASCII } from 'url';
dotenv.config();

export interface Entorno {
  PUERTO_BROKER: number;
  PUERTO_SOCKET: number;
  PUERTO_API: number;
  SQL_SERVIDOR: string;
  SQL_USUARIO: string;
  SQL_CONTRASENA: string;
  SQL_BASE_DATOS: string;
  SQL_PUERTO: number;
  REDIS_USUARIO: string;
  REDIS_SERVIDOR: string;
  REDIS_CONTRASENA: string;
  REDIS_PUERTO: number;
  DIRECTORIO: string;
  SMTP_HOST: string;
  SMTP_PUERTO: number;
  SMTP_USUARIO: string;
  SMTP_CONTRASENA: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  ENLACE_SERVIDOR: string;
}

function obtenerVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `La variable de entorno "${nombre}" es obligatoria.`
    );
  }

  return valor;
}

function obtenerEnlaceServidor(): string {
  const enlace = obtenerVariable('ENLACE_SERVIDOR').trim();
  const dominioAscii = domainToASCII(enlace);
  const etiquetas = dominioAscii.split('.');
  const dominioValido =
    dominioAscii.length <= 253 &&
    etiquetas.every((etiqueta) =>
      etiqueta.length > 0 &&
      etiqueta.length <= 63 &&
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(etiqueta)
    );

  if (isIP(enlace) === 4) {
    return enlace;
  }
  if (dominioValido) {
    return dominioAscii;
  }

  throw new Error(
    'La variable de entorno "ENLACE_SERVIDOR" debe contener un dominio o una dirección IPv4, sin protocolo ni ruta.'
  );
}

function cargarEntorno(): Entorno {
  return {
    PUERTO_BROKER: parseInt(obtenerVariable('PUERTO_BROKER'), 10),
    PUERTO_SOCKET: parseInt(obtenerVariable('PUERTO_SOCKET'), 10),
    PUERTO_API: parseInt(obtenerVariable('PUERTO_API'), 10),
    SQL_SERVIDOR: obtenerVariable('SQL_SERVIDOR'),
    SQL_USUARIO: obtenerVariable('SQL_USUARIO'),
    SQL_CONTRASENA: obtenerVariable('SQL_CONTRASENA'),
    SQL_BASE_DATOS: obtenerVariable('SQL_BASE_DATOS'),
    SQL_PUERTO: parseInt(obtenerVariable('SQL_PUERTO'), 10),

    REDIS_USUARIO: obtenerVariable('REDIS_USUARIO'),
    REDIS_SERVIDOR: obtenerVariable('REDIS_SERVIDOR'),
    REDIS_CONTRASENA: obtenerVariable('REDIS_CONTRASENA'),
    REDIS_PUERTO: parseInt(obtenerVariable('REDIS_PUERTO'), 10),

    DIRECTORIO: obtenerVariable('DIRECTORIO'),
    ENLACE_SERVIDOR: obtenerEnlaceServidor(),

    SMTP_HOST: obtenerVariable('SMTP_HOST'),
    SMTP_PUERTO: parseInt(obtenerVariable('SMTP_PUERTO'), 10),
    SMTP_USUARIO: obtenerVariable('SMTP_USUARIO'),
    SMTP_CONTRASENA: obtenerVariable('SMTP_CONTRASENA'),

    VAPID_PUBLIC_KEY: obtenerVariable('VAPID_PUBLIC_KEY'),
    VAPID_PRIVATE_KEY: obtenerVariable('VAPID_PRIVATE_KEY'),
  };
}
/** Instancia singleton de la configuración del entorno */
export const entorno: Entorno = cargarEntorno();
