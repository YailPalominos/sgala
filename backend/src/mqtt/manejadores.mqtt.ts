import { obtenerDatosDispositivos } from '../repositorios/dispositivo.repositorio';
import { EstadoDispositivoRedis, redisRepositorio } from '../repositorios/redis.repositorio';

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