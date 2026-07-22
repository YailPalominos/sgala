import Aedes from 'aedes';
import tls from 'tls';
import fs from 'fs';
import { entorno } from '../recursos/entorno';
import { redisRepositorio } from '@/repositorios/redis.repositorio';

/**
 * Instancia del broker MQTT basado en aedes.
 * Gestiona conexiones de dispositivos físicos GPS autenticados con TLS.
 */
export const aedesInstance = new Aedes();

function obtenerCN(certificado: tls.PeerCertificate): string | null {

  const cn = certificado.subject?.CN;

  if (!cn) {
    return null;
  }

  if (Array.isArray(cn)) {
    return cn[0] ?? null;
  }

  return cn;
}

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
    key: fs.readFileSync(`${rutaCertificados}/servidor.key`),
    cert: fs.readFileSync(`${rutaCertificados}/servidor.cer`),
    ca: fs.readFileSync(`${rutaCertificados}/ca.cer`),
    requestCert: true,
    rejectUnauthorized: true,
  };

  const servidor = tls.createServer(
    opciones,
    async (socket) => {

      const certificado = socket.getPeerCertificate();


      const claveDispositivo = obtenerCN(certificado);


      console.log(
        '🔐 Cliente TLS:',
        claveDispositivo
      );


      if (!claveDispositivo) {

        console.error(
          '❌ Certificado sin CN'
        );

        socket.destroy();
        return;
      }


      // Aquí validas si está autorizado
      const autorizado = await redisRepositorio.obtenerDispositivo(claveDispositivo);

      if (!autorizado) {
        console.error(
          `❌ Dispositivo bloqueado: ${claveDispositivo}`
        );
        socket.destroy();
        return;
      }


      aedesInstance.handle(socket);

    }
  );


  servidor.listen(
    entorno.PUERTO_MQTT,
    () => {
      console.log(
        `📨 Broker MQTT TLS escuchando en ${entorno.PUERTO_MQTT}`
      );
    }
  );


  return servidor;

}
