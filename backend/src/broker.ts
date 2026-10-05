import Aedes, { Client } from 'aedes';
import tls from 'tls';
import { entorno } from './recursos/entorno';
import { leerCertificadosServidor, obtenerClaveDispositivoDesdeCertificado } from './servicios/certificados.servicio';
import { enviarDispositivoActualizado, enviarNotificacionUsuario } from './socket';
import { obtenerDatosDispositivos } from './repositorios/base-datos/dispositivo.repositorio';
import dayjs from "dayjs";
import { enviarWebPush } from './webpush';
import { actualizarDatosDispositivo, actualizarEstatusConexion, agregarAlarma, eliminarAlarma, eliminarAlarmasDesconexion, EstadoDispositivoRedis, guardarEstadosDispositivos, obtenerDispositivo, obtenerDispositivosSinConexion } from './repositorios/redis/dispositivo.redis';
import { agregarNotificacion, eliminarNotificacionDesconexion, eliminarNotificacionPorAlarma } from './repositorios/redis/notificaciones.redis';
import { obtenerSuscripciones } from './repositorios/redis/suscripciones.redis';
import { crearEventoSistema } from './repositorios/base-datos/evento.repositorio';

export interface ClienteMqtt extends Client {
  claveDispositivo: string;
}

export const aedesInstance = new Aedes();

export async function iniciarBrokerMqtt(): Promise<tls.Server> {

  await iniciarConexiones();

  const opciones: tls.TlsOptions = leerCertificadosServidor(entorno.DIRECTORIO);

  const servidor = tls.createServer(
    opciones,
    async (socket) => {

      const certificado = socket.getPeerCertificate();
      const claveDispositivo = obtenerClaveDispositivoDesdeCertificado(certificado);
      
      if (!claveDispositivo) {
        socket.destroy();
        return;
      }

      try {

        await obtenerDispositivo(
          claveDispositivo
        );

      } catch {

        socket.destroy();
        return;

      }

      (socket as any).claveDispositivo =
        claveDispositivo;
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
    async (packet, cliente) => {

      if (!cliente) {
        return;
      }

      await onPublicacion(
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

    const clavesAlarmasEliminadas = await eliminarAlarmasDesconexion(claveDispositivo);

    const dispositivo = await obtenerDispositivo(claveDispositivo);

    for (const claveAlarma of clavesAlarmasEliminadas) {
      await eliminarNotificacionPorAlarma(dispositivo.idUsuario, claveAlarma);
    }

    await eliminarNotificacionDesconexion(dispositivo.idUsuario, dispositivo.clave);

    await crearEventoSistema(
      dispositivo.idUsuario,
      `Dispositivo ${claveDispositivo} conectado.`
    );

    await enviarDispositivoActualizado(claveDispositivo)
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
      estatusEncendida: null,
      estatusMovimiento: null,
      localizacion: null,
      estatus:null
    });
    

    const dispositivo = await obtenerDispositivo(claveDispositivo);

    const claveAlarmaDesconexion = crypto.randomUUID();

    await agregarAlarma(claveDispositivo, {
      clave: claveAlarmaDesconexion,
      descripcion: `Dispositivo sin conexión`,
      fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
    });

    await enviarDispositivoActualizado(claveDispositivo)

    await agregarNotificacion(
      dispositivo.idUsuario,
      {
        clave: crypto.randomUUID(),
        descripcion: `Dispositivo '${dispositivo.alias}' sin conexión.`,
        fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        atendida: null,
        claveDispositivo: dispositivo.clave,
        claveAlarma: claveAlarmaDesconexion,
        origen: 'conexion'
      }
    );

    await crearEventoSistema(
      dispositivo.idUsuario,
      `Alarma dispositivo clave:"${claveDispositivo}" sin conexión generada con la clave de alarma:"${claveAlarmaDesconexion}"`
    );

    await enviarNotificacionUsuario(dispositivo.idUsuario);

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
        },
        dispositivo.idUsuario
      );
    }

  } catch (error) {
    console.error(
      `❌ Error al desconectar el dispositivo: ${error}`
    );
  }
}

/**
 * Se ejecuta cuando un dispositivo publica un mensaje.
 */
export async function onPublicacion(claveDispositivo: string, topico: string, payload: Buffer) {
  try {

    if (topico.startsWith('respuestas/')) {
      return;
    }

    const datos = JSON.parse(
      payload.toString("utf8")
    );

    await actualizarDatosDispositivo(claveDispositivo, datos);
    await enviarDispositivoActualizado(claveDispositivo);

    // await actualizarDatosDispositivo(claveDispositivo, datos)

    // const dispositivo = await obtenerDispositivo(claveDispositivo);

    // if (datos.estatusAlarma === false) {
    //   const alarmasSensor = dispositivo.alarmas?.filter(
    //     a => a.descripcion.includes('giroscopio/acelerómetro')
    //   ) ?? [];

    //   for (const alarma of alarmasSensor) {
    //     await eliminarAlarma(claveDispositivo, alarma.clave);
    //     await eliminarNotificacionPorAlarma(dispositivo.idUsuario, alarma.clave, dispositivo.clave, 'alarma');
    //   }

    //   await actualizarDatosDispositivo(claveDispositivo, {
    //     estatusFijarEstacionado: false
    //   });

    //   if (alarmasSensor.length > 0) {
    //     await enviarNotificacionUsuario(dispositivo.idUsuario);
    //   }
    // }

    // await enviarDispositivoActualizado(claveDispositivo)

    // if (datos.estatusAlarma === true && dispositivo.estatusAlarma === true && dispositivo.estatusFijarEstacionado === true) {
    //   const yaExisteSensor = dispositivo.alarmas?.some(a => a.descripcion.includes('giroscopio/acelerómetro'));

    //   if (!yaExisteSensor) {
    //     const claveAlarmaSensor = crypto.randomUUID();

    //     await agregarAlarma(claveDispositivo, {
    //       clave: claveAlarmaSensor,
    //       descripcion: 'Movimiento detectado (giroscopio/acelerómetro)',
    //       fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
    //     });

    //     await agregarNotificacion(
    //       dispositivo.idUsuario,
    //       {
    //         clave: crypto.randomUUID(),
    //         descripcion: `Alarma en '${dispositivo.alias}': movimiento detectado (giroscopio/acelerómetro).`,
    //         fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    //         atendida: null,
    //         claveDispositivo: dispositivo.clave,
    //         claveAlarma: claveAlarmaSensor,
    //         origen: 'alarma'
    //       }
    //     );

    //     await crearEventoSistema(
    //       dispositivo.idUsuario,
    //       `Alarma dispositivo clave:"${claveDispositivo}" movimiento detectado (giroscopio/acelerómetro) generada con la clave de alarma:"${claveAlarmaSensor}"`
    //     );

    //     await enviarNotificacionUsuario(dispositivo.idUsuario);
    //     await enviarDispositivoActualizado(claveDispositivo);
    //   }
    // }

    // if (dispositivo.estatusFijarEstacionado === true && dispositivo.estatusMovimiento === true) {
    //   const yaExisteGPS = dispositivo.alarmas?.some(a => a.descripcion.includes('GPS'));

    //   if (!yaExisteGPS) {
    //     const claveAlarmaMovimiento = crypto.randomUUID();

    //     await agregarAlarma(claveDispositivo, {
    //       clave: claveAlarmaMovimiento,
    //       descripcion: 'Movimiento detectado (GPS)',
    //       fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
    //     });

    //     await agregarNotificacion(
    //       dispositivo.idUsuario,
    //       {
    //         clave: crypto.randomUUID(),
    //         descripcion: `Alarma en '${dispositivo.alias}': movimiento detectado (GPS).`,
    //         fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    //         atendida: null,
    //         claveDispositivo: dispositivo.clave,
    //         claveAlarma: claveAlarmaMovimiento,
    //         origen: 'alarma'
    //       }
    //     );

    //     await crearEventoSistema(
    //       dispositivo.idUsuario,
    //       `Alarma dispositivo clave:"${claveDispositivo}" movimiento detectado (GPS) generada con la clave de alarma:"${claveAlarmaMovimiento}"`
    //     );

    //     await enviarNotificacionUsuario(dispositivo.idUsuario);
    //     await enviarDispositivoActualizado(claveDispositivo);
    //   }
    // }

    // if (dispositivo.porcentajeBateria !== null && dispositivo.porcentajeBateria <= 20) {
    //   const yaTieneBateriaBaja = dispositivo.alarmas?.some(
    //     a => a.descripcion.includes('Batería baja')
    //   );

    //   if (!yaTieneBateriaBaja) {
    //     const claveAlarmaBateria = crypto.randomUUID();

    //     await agregarAlarma(claveDispositivo, {
    //       clave: claveAlarmaBateria,
    //       descripcion: `Batería baja (${dispositivo.porcentajeBateria}%)`,
    //       fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
    //     });

    //     await agregarNotificacion(
    //       dispositivo.idUsuario,
    //       {
    //         clave: crypto.randomUUID(),
    //         descripcion: `Alarma en '${dispositivo.alias}': batería baja (${dispositivo.porcentajeBateria}%).`,
    //         fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    //         atendida: null,
    //         claveDispositivo: dispositivo.clave,
    //         claveAlarma: claveAlarmaBateria,
    //         origen: 'alarma'
    //       }
    //     );

    //     await crearEventoSistema(
    //       dispositivo.idUsuario,
    //       `Alarma dispositivo clave:"${claveDispositivo}" batería baja ${dispositivo.porcentajeBateria}% generada con la clave de alarma:"${claveAlarmaBateria}"`
    //     );

    //     await enviarNotificacionUsuario(dispositivo.idUsuario);
    //     await enviarDispositivoActualizado(claveDispositivo);
    //   }
    // } else if (dispositivo.porcentajeBateria !== null && dispositivo.porcentajeBateria > 20) {
    //   const alarmaBateria = dispositivo.alarmas?.find(
    //     a => a.descripcion.includes('Batería baja')
    //   );

    //   if (alarmaBateria) {
    //     try {
    //       await eliminarAlarma(claveDispositivo, alarmaBateria.clave);
    //       await eliminarNotificacionPorAlarma(dispositivo.idUsuario, alarmaBateria.clave);
    //       await enviarNotificacionUsuario(dispositivo.idUsuario);
    //       await enviarDispositivoActualizado(claveDispositivo);
    //     } catch { }
    //   }
    // }
    // // console.log("Dispositivo:", claveDispositivo);
    // // console.log("Tópico:", topico);
    // // console.log("Datos:", datos);

    // if (datos.localizacion) {
    //   const { latitud, longitud, altitud } = datos.localizacion;

    //   if (
    //     latitud !== undefined &&
    //     longitud !== undefined &&
    //     altitud !== undefined
    //   ) {

    //     await crearLocalizacion(claveDispositivo, datos.localizacion)
    //   }
    // }

  } catch (error) {

    console.error(
      "Error en publicación:",
      claveDispositivo,
      error
    );

  }
}

/**
 * Envía una solicitud a un dispositivo MQTT y espera confirmación
 * en el tópico respuestas/${claveDispositivo}.
 *
 * Timeout de 10 segundos.
 */
export async function enviarSolicitudDispositivo(claveDispositivo: string, datos: Record<string, any>): Promise<{ estatus: boolean; mensaje: string }> {
  return new Promise((resolve, reject) => {

    const timeout = setTimeout(() => {
      aedesInstance.removeListener('publish', listener);
      reject(new Error('Tiempo de espera agotado. El dispositivo no respondió.'));
    }, 10_000);

    const listener = (packet: any, cliente: any) => {
      if (!cliente) return;

      const topico = packet.topic;

      if (topico !== `respuestas/${claveDispositivo}`) {
        return;
      }

      clearTimeout(timeout);
      aedesInstance.removeListener('publish', listener);

      try {
        const respuesta = JSON.parse(packet.payload.toString('utf8'));
        console.log('📥 Respuesta dispositivo:', { dispositivo: claveDispositivo, respuesta });
        resolve({
          estatus: respuesta.estatus === true,
          mensaje: respuesta.mensaje || ''
        });
      } catch {
        resolve({ estatus: false, mensaje: 'Respuesta inválida del dispositivo.' });
      }
    };

    aedesInstance.addListener('publish', listener);

    const { clave, ...datosDispositivo } = datos;

    const payload = Buffer.from(
      JSON.stringify(datosDispositivo)
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
          clearTimeout(timeout);
          aedesInstance.removeListener('publish', listener);
          reject(new Error('Error enviando solicitud MQTT.'));
        } else {
          console.log('📤 Solicitud enviada:', { dispositivo: claveDispositivo, datos });
        }
      }
    );

  });
}

export async function iniciarConexiones() {
  try {
    const dispositivosClave = await obtenerDatosDispositivos();
    const estados: EstadoDispositivoRedis[] = dispositivosClave.map(dispositivo => ({
      clave: dispositivo.clave,
      idUsuario: dispositivo.idUsuario,
      alias: dispositivo.alias,
      telefono: dispositivo.telefono,
      tipo: dispositivo.tipo,
      tipoTexto: dispositivo.tipoTexto,
      cualidades: dispositivo.cualidades,
      estatus: null,
      estatusConexion: null,
      localizacion: null,
      estatusAlarma: null,
      estatusCortaCorriente: null,
      estatusDirecto: null,
      fechaFinalSuscripcion: dispositivo.fechaFinalSuscripcion
        ? dispositivo.fechaFinalSuscripcion.toISOString()
        : null,
      estatusEncendida: null,
      estatusMovimiento: null,
      porcentajeBateria: null,
      estatusFijarEstacionado: null,
      alarmas: null
    }));

    await guardarEstadosDispositivos(estados);

    setTimeout(async () => {
      await verificarDispositivosSinConexion();
    }, 60_000);

  } catch (error) {
    console.error('❌ Error al iniciar conexiones MQTT:', error);
  }
}

async function verificarDispositivosSinConexion(): Promise<void> {

  try {

    const dispositivos = await obtenerDispositivosSinConexion();

    for (const dispositivo of dispositivos) {

      const claveAlarmaDesconexion = crypto.randomUUID();

      await agregarAlarma(dispositivo.clave, {
        clave: claveAlarmaDesconexion,
        descripcion: `Dispositivo sin conexión`,
        fecha: dayjs().format('YYYY-MM-DD HH:mm:ss')
      });

      await enviarDispositivoActualizado(dispositivo.clave);

      await agregarNotificacion(
        dispositivo.idUsuario,
        {
          clave: crypto.randomUUID(),
          descripcion: `Dispositivo '${dispositivo.alias}' sin conexión.`,
          fecha: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          atendida: null,
          claveDispositivo: dispositivo.clave,
          claveAlarma: claveAlarmaDesconexion,
          origen: 'conexion'
        }
      );

      await crearEventoSistema(
        dispositivo.idUsuario,
        `Alarma dispositivo clave:"${dispositivo.clave}" sin conexión generada con la clave de alarma:"${claveAlarmaDesconexion}"`
      );

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
          },
          dispositivo.idUsuario
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
