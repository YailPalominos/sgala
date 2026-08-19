import { actualizarClaveSocket, obtenerSocketsUsuario } from './redis/sesiones.redis';
import {
    obtenerDispositivo,
    obtenerDispositivosUsuario,
    actualizarDatosDispositivo,
    agregarAlarma
} from './redis/dispositivo.redis';
import { obtenerNotificaciones, cambiarAtencionNotificacion } from './redis/notificaciones.redis';
import { actualizarPrecios, obtenerPrecios } from './redis/datos.redis';


/**
 * Fachada que agrupa las operaciones Redis
 * utilizadas por los módulos de la aplicación.
 */
export const redisRepositorio = {

    /**
     * Actualiza la clave del socket de una sesión.
     *
     * Wrapper que obtiene el idUsuario directamente
     * desde la sesión almacenada en Redis.
     */
    async actualizarClaveSocket(
        claveSesion: string,
        claveSocket: string
    ): Promise<void> {

        const { redis } = await import('../recursos/redis');

        const datos = await redis.hgetall(
            `sesiones:${claveSesion}`
        );

        if (!datos || Object.keys(datos).length === 0) {
            throw new Error(
                'La sesión no existe o ha expirado.'
            );
        }

        const idUsuario = Number(datos.idUsuario);

        await actualizarClaveSocket(
            idUsuario,
            claveSesion,
            claveSocket
        );
    },

    obtenerDispositivosUsuario,

    obtenerNotificaciones,

    agregarAlarma,

    actualizarDatosDispositivo,

    cambiarAtencionNotificacion,

    obtenerDispositivo,

    obtenerSocketsUsuario,

    obtenerPrecios,

    actualizarPrecios
};
