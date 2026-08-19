import Aedes, { Client } from 'aedes';
import tls from 'tls';
import fs from 'fs';
import { entorno } from './recursos/entorno';
import { enviarDispositivoActualizado, enviarNotificacionUsuario } from './socket';
import { obtenerDatosDispositivos, crearLocalizacion } from './repositorios/base-datos/dispositivo.repositorio';
import dayjs from "dayjs";
import { enviarWebPush } from './webpush';
import { actualizarDatosDispositivo, actualizarEstatusConexion, EstadoDispositivoRedis, guardarEstadosDispositivos, obtenerDispositivo, obtenerDispositivosSinConexion } from './repositorios/redis/dispositivo.redis';
import { agregarNotificacion, eliminarNotificacionDesconexion } from './repositorios/redis/notificaciones.redis';
import { obtenerSuscripciones } from './repositorios/redis/suscripciones.redis';

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

export async function iniciarBrokerMqtt(): Promise<tls.Server> {

  await iniciarConexiones();

  const rutaCertificados = entorno.DIRECTORIO;

  const opciones: tls.TlsOptions = {
    key: fs.readFileSync(`${rutaCertificados}/certificados/servidor.key`),
    cert: fs.readFileSync(`${rutaCertificados}/certificados/servidor.crt`),
    ca: fs.readFileSync(`${rutaCertificados}/certificados/ca.crt`),
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

        await obtenerDispositivo(
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

    if (!claveDispositivo) {
      return;
    }

    (cliente as ClienteMqtt).claveDispositivo =
      claveDispositivo;

    callback(null, true);

  };

  servidor.listen(
    entorno.PUERTO_BROKER,
    () => {

      console.log(
        `📨 Broker escuchando en ${entorno.PUERTO_BROKER}`
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

    await actualizarEstatusConexion(claveDispositivo, true);
    await enviarDispositivoActualizado(claveDispositivo)
    const dispositivo = await obtenerDispositivo(claveDispositivo);
    await eliminarNotificacionDesconexion(dispositivo.idUsuario, dispositivo.clave)
    await enviarNotificacionUsuario(dispositivo.idUsuario)

  } catch (error) {
    console.error(`❌ Error al conectar el dispositivo: ${error}`);
  }
}

/**
 * Se ejecuta cuando un dispositivo se desconecta.
 */
export async function desconectar(claveDispositivo: string) {
  try {

    await actualizarEstatusConexion(claveDispositivo, false);

    await actualizarDatosDispositivo(claveDispositivo, {
      estatusAlarma: null,
      estatusCortaCorriente: null,
      porcentajeBateria: null,
      estado: null,
      localizacion: null
    });

    await enviarDispositivoActualizado(claveDispositivo)

    const dispositivo = await obtenerDispositivo(claveDispositivo);

    await agregarNotificacion(
      dispositivo.idUsuario,
      {
        clave: crypto.randomUUID(),
        descripcion: `Dispositivo '${dispositivo.alias}' sin conexión.`,
        fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        atendida: null,
        claveDispositivo: dispositivo.clave
      }
    );

    await verificarDispositivosSinConexion()

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

    actualizarDatosDispositivo(claveDispositivo, datos)
    await enviarDispositivoActualizado(claveDispositivo)
    // console.log("Dispositivo:", claveDispositivo);
    // console.log("Tópico:", topico);
    // console.log("Datos:", datos);

    if (datos.localizacion) {
      const { latitud, longitud, altitud } = datos.localizacion;

      if (
        latitud !== undefined &&
        longitud !== undefined &&
        altitud !== undefined
      ) {

        await crearLocalizacion(claveDispositivo, datos.localizacion)
      }
    }

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

export async function iniciarConexiones() {
  try {
    const dispositivosClave = await obtenerDatosDispositivos();

    const estados: any[] = dispositivosClave.map(dispositivo => ({
      clave: dispositivo.clave,
      idUsuario: dispositivo.idUsuario,
      alias: dispositivo.alias,
      telefono: dispositivo.telefono,
      cualidades: dispositivo.cualidades,
      estatusConexion: null,
      localizacion: null,
      estatusAlarma: null,
      estatusCortaCorriente: null,
      estatusDirecto: null,
      fechaFinalSuscripcion: dispositivo.fechaFinalSuscripcion
        ? dispositivo.fechaFinalSuscripcion.toISOString()
        : null,
      estado: null,
      porcentajeBateria: null,
      estatusFijarEstacionado:null
    }));

    await guardarEstadosDispositivos(estados);

    // setTimeout(async () => {
    //   await verificarDispositivosSinConexion();
    // }, 60_000);

  } catch (error) {
    console.error('❌ Error al iniciar conexiones MQTT:', error);
  }
}

async function verificarDispositivosSinConexion(): Promise<void> {

  try {

    const dispositivos = await obtenerDispositivosSinConexion();

    for (const dispositivo of dispositivos) {

      await generarNotificacionSinConexion(dispositivo);
      await enviarNotificacionUsuario(dispositivo.idUsuario)

      const suscripciones = await obtenerSuscripciones(dispositivo.idUsuario);

      for (const suscripcion of suscripciones) {
        await enviarWebPush(
          suscripcion,
          'SICVA',
          `Dispositivo '${dispositivo.alias}' sin conexión.`,
          {
            tipo: 'sin-conexion',
            claveDispositivo: dispositivo.clave,
            alias: dispositivo.alias
          }
        );

      }
    }

  } catch (error) {

    console.error(
      '❌ Error verificando dispositivos sin conexión:',
      error
    );

  }

}
/**
 * Genera una notificación indicando que un dispositivo permanece sin conexión.
 */
export async function generarNotificacionSinConexion(
  dispositivo: EstadoDispositivoRedis
): Promise<void> {

  await agregarNotificacion(
    dispositivo.idUsuario,
    {
      clave: crypto.randomUUID(),
      descripcion: `Dispositivo '${dispositivo.alias}' sin conexión.`,
      fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      atendida: null,
      claveDispositivo: dispositivo.clave
    }
  );

}