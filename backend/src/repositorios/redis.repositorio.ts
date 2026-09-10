import { actualizarClaveSocket, obtenerSocketsUsuario, obtenerSesionPorClave } from './redis/sesiones.redis';
import {
    obtenerDispositivo,
    obtenerDispositivosUsuario,
    actualizarDatosDispositivo,
    agregarAlarma,
    eliminarAlarma
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
     * Obtiene el idUsuario buscando la sesión por clave.
     */
    async actualizarClaveSocket(
        claveSesion: string,
        claveSocket: string
    ): Promise<void> {

        const sesion = await obtenerSesionPorClave(claveSesion);

        if (!sesion) {
            throw new Error(
                'La sesión no existe o ha expirado.'
            );
        }

        await actualizarClaveSocket(
            sesion.idUsuario,
            claveSesion,
            claveSocket
        );
    },

    obtenerDispositivosUsuario,

    obtenerNotificaciones,

    agregarAlarma,

    eliminarAlarma,

    actualizarDatosDispositivo,

    cambiarAtencionNotificacion,

    obtenerDispositivo,

    obtenerSocketsUsuario,

    obtenerPrecios,

    actualizarPrecios
};
