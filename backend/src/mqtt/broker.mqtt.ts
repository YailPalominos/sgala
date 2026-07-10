import Aedes from 'aedes';
import tls from 'tls';
import fs from 'fs';
import { entorno } from '../configuracion/entorno';

/**
 * Instancia del broker MQTT basado en aedes.
 * Gestiona conexiones de dispositivos físicos GPS autenticados con TLS.
 */
export const aedesInstance = new Aedes();

/**
 * Inicia el broker MQTT con autenticación TLS en el puerto configurado (4060 por defecto).
 * Los certificados se cargan desde la ruta definida en la variable de entorno RUTA_CERTIFICADOS.
 *
 * Archivos requeridos en RUTA_CERTIFICADOS:
 * - server.key: Clave privada del servidor
 * - server.crt: Certificado del servidor
 * - ca.crt: Certificado de la autoridad certificadora para verificar clientes
 *
 * @returns El servidor TLS creado
 */
export function iniciarBrokerMqtt(): tls.Server {
  const rutaCertificados = entorno.RUTA_CERTIFICADOS;

  const opciones: tls.TlsOptions = {
    key: fs.readFileSync(`${rutaCertificados}/server.key`),
    cert: fs.readFileSync(`${rutaCertificados}/server.crt`),
    ca: fs.readFileSync(`${rutaCertificados}/ca.crt`),
    requestCert: true,
    rejectUnauthorized: true,
  };

  const servidor = tls.createServer(opciones, aedesInstance.handle);

  servidor.listen(entorno.PUERTO_MQTT, () => {
    console.log(`Broker MQTT escuchando en puerto ${entorno.PUERTO_MQTT} con TLS`);
  });

  return servidor;
}
