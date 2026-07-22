import { obtenerDatosDispositivos } from '../repositorios/dispositivo.repositorio';
import { EstadoDispositivoRedis, redisRepositorio } from '../repositorios/redis.repositorio';
import { enviarDispositivoActualizado } from '../socketio/servidor.socketio'

interface Datos {
  estatusAlarma: boolean | null;
  estatusCortaCorriente: boolean | null;
  porcentajeBateria: number | null;
  estado: string | null;
}

interface Localizacion {
  latitud: number;
  longitud: number;
  altitud: number;
}


export async function iniciarConexiones() {
  try {
    const dispositivosClave = await obtenerDatosDispositivos();


    const estados: EstadoDispositivoRedis[] = dispositivosClave.map(dispositivo => ({
      clave: dispositivo.clave,
      idUsuario: dispositivo.idUsuario,
      alias: dispositivo.alias,
      telefono: dispositivo.telefono,
      cualidades: dispositivo.cualidades,
      estatusConexion: undefined,
      localizacion: undefined,
      estatusAlarma: undefined,
      estatusCortaCorriente: undefined,
      estatusDirecto: undefined,
      fechaFinalSuscripcion: dispositivo.fechaFinalSuscripcion
        ? dispositivo.fechaFinalSuscripcion.toISOString()
        : undefined,
      estado: undefined,
      porcentajeBateria: undefined
    }));

    console.log(`🔄 Inicializando ${estados.length} dispositivos en Redis`);

    await redisRepositorio.guardarEstadosDispositivos(estados);

  } catch (error) {
    console.error('❌ Error al iniciar conexiones MQTT:', error);
  }
}


export async function onConexion(clienteId: string): Promise<void> {
  const clave = clienteId;
  const dispositivo = await redisRepositorio.obtenerDispositivo(clave);
  if (!dispositivo) {
    console.error(`? [MQTT] Conexión rechazada: dispositivo con UUID "${clave}" no encontrado`);
    return;
  }
  await redisRepositorio.actualizarEstatusConexion(clave, true);
  await enviarDispositivoActualizado(clave)
}

export async function onDesconexion(clienteId: string): Promise<void> {
  const clave = clienteId;
  await redisRepositorio.actualizarEstatusConexion(clave, true);
  await enviarDispositivoActualizado(clave)
}

export async function onPublicacion(topic: string, mensaje: Buffer): Promise<void> {

  // const partes = topic.split('/');

  // if (
  //   partes.length !== 3 ||
  //   partes[0] !== 'dispositivos' ||
  //   partes[2] !== 'datos'
  // ) {
  //   console.error(`❌ [MQTT] Topic inválido: "${topic}"`);
  //   return;
  // }

  // const uuid = partes[1];

  // if (!uuid) {
  //   console.error(`❌ [MQTT] UUID no encontrado en topic "${topic}"`);
  //   return;
  // }

  // let datos: DatosActualizacionDispositivo;
  // try {
  //   datos = JSON.parse(mensaje.toString());
  // } catch {
  //   console.error(
  //     `❌ [MQTT] Mensaje no es JSON válido en "${topic}"`
  //   );
  //   return;
  // }


  // const actualizacion: Partial<DatosActualizacionDispositivo> = {};


  // for (const campo of CAMPOS_PERMITIDOS) {

  //   if (Object.prototype.hasOwnProperty.call(datos, campo)) {
  //     actualizacion[campo] = datos[campo];
  //   }

  // }


  // if (Object.keys(actualizacion).length === 0) {

  //   console.warn(
  //     `⚠️ [MQTT] Sin datos válidos para actualizar dispositivo ${uuid}`
  //   );

  //   return;
  // }


  // console.log(
  //   `📡 [MQTT] Datos actualizados ${uuid}:`,
  //   actualizacion
  // );


  // await redisRepositorio.actualizarDatosDispositivo(
  //   uuid,
  //   actualizacion
  // );


  // await enviarDispositivoActualizado(uuid);
}