import Aedes, { Client } from 'aedes';
import tls from 'tls';
import fs from 'fs';
import { entorno } from '../recursos/entorno';
import { redisRepositorio } from '@/repositorios/redis.repositorio';
import { enviarDispositivoActualizado } from '@/socketio/servidor.socketio';

export interface ClienteMqtt extends Client {
  claveDispositivo: string;
}

export const aedesInstance = new Aedes();

function obtenerCN(
  certificado: tls.PeerCertificate
): string | null {

  const cn = certificado.subject?.CN;

  if (!cn) {
    return null;
  }

  return Array.isArray(cn)
    ? cn[0] ?? null
    : cn;
}

export function iniciarBrokerMqtt(): tls.Server {

  const rutaCertificados = entorno.RUTA_CERTIFICADOS;

  const opciones: tls.TlsOptions = {
    key: fs.readFileSync(`${rutaCertificados}/servidor.key`),
    cert: fs.readFileSync(`${rutaCertificados}/servidor.crt`),
    ca: fs.readFileSync(`${rutaCertificados}/ca.crt`),
    requestCert: true,
    rejectUnauthorized: true
  };

  const servidor = tls.createServer(
    opciones,
    async (socket) => {

      const certificado = socket.getPeerCertificate();

      const claveDispositivo = obtenerCN(certificado);

      if (!claveDispositivo) {
        socket.destroy();
        return;
      }

      try {

        await redisRepositorio.obtenerDispositivo(
          claveDispositivo.toUpperCase()
        );

      } catch {

        socket.destroy();
        return;

      }

      (socket as any).claveDispositivo =
        claveDispositivo.toUpperCase();

      aedesInstance.handle(socket);

    }
  );

  aedesInstance.authenticate = (
    cliente,
    _username,
    _password,
    callback
  ) => {

    const socket = cliente.conn as any;

    const claveDispositivo = socket.claveDispositivo;

    // if (!claveDispositivo) {
    //   callback(new Error('Cliente sin identidad'));
    //   return;
    // }

    (cliente as ClienteMqtt).claveDispositivo =
      claveDispositivo;

    callback(null, true);

  };

  servidor.listen(
    entorno.PUERTO_MQTT,
    () => {

      console.log(
        `📨 Broker MQTT TLS escuchando en ${entorno.PUERTO_MQTT}`
      );

    }
  );

  aedesInstance.on(
    'client',
    async (cliente) => {

      const { claveDispositivo } =
        cliente as ClienteMqtt;

      await conectar(
        claveDispositivo
      );

    }
  );

  aedesInstance.on(
    'clientDisconnect',
    async (cliente) => {

      const { claveDispositivo } =
        cliente as ClienteMqtt;

      await desconectar(
        claveDispositivo
      );

    }
  );

  aedesInstance.addListener(
    'publish',
    (packet, cliente) => {

      if (!cliente) {
        return;
      }

      onPublicacion(
        (cliente as ClienteMqtt).claveDispositivo,
        packet.topic,
        packet.payload as Buffer
      );

    }
  );

  return servidor;
}

/**
 * Se ejecuta cuando un dispositivo establece una conexión MQTT.
 */
export async function conectar(claveDispositivo: string) {
  try {

    await redisRepositorio.actualizarEstatusConexion(claveDispositivo, true);
    await enviarDispositivoActualizado(claveDispositivo)

  } catch (error) {
    console.error(
      `❌ Error al conectar el dispositivo: ${error}`
    );
  }
}

/**
 * Se ejecuta cuando un dispositivo se desconecta.
 */
export async function desconectar(claveDispositivo: string) {
  try {

    await redisRepositorio.actualizarEstatusConexion(claveDispositivo, false);
    await enviarDispositivoActualizado(claveDispositivo)

  } catch (error) {
    console.error(
      `❌ Error al desconectar el dispositivo: ${error}`
    );
  }
}

/**
 * Se ejecuta cuando un dispositivo publica un mensaje.
 */
export async function onPublicacion(
  claveDispositivo: string,
  topico: string,
  payload: Buffer
) {

  try {

    const datos = JSON.parse(
      payload.toString("utf8")
    );

    redisRepositorio.actualizarDatosDispositivo(claveDispositivo, datos)
    await enviarDispositivoActualizado(claveDispositivo)
    // console.log("Dispositivo:", claveDispositivo);
    // console.log("Tópico:", topico);
    // console.log("Datos:", datos);

  } catch (error) {

    console.error(
      "Payload inválido:",
      payload.toString("utf8")
    );

  }
}

/**
 * Envía una solicitud a un dispositivo MQTT.
 */
export async function enviarSolicitudDispositivo(
  claveDispositivo: string,
  datos: Record<string, any>
): Promise<void> {

  const payload = Buffer.from(
    JSON.stringify(datos)
  );


  aedesInstance.publish(
    {
      cmd: 'publish',
      topic: `solicitudes/${claveDispositivo}`,
      payload,
      qos: 0,
      retain: false,
      dup: false
    },
    (error) => {

      if (error) {

        console.error(
          '❌ Error enviando solicitud MQTT:',
          error
        );

        return;
      }


      console.log(
        '📤 Solicitud enviada:',
        {
          dispositivo: claveDispositivo,
          datos
        }
      );

    }
  );

}