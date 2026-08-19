import { redis } from '../../recursos/redis';

export interface Notificacion {
    clave: string;
    descripcion: string;
    fecha: string;
    atendida: boolean | null;
    claveDispositivo: string;
}

/**
* Obtiene las notificaciones de un usuario.
* Si no existen, devuelve un arreglo vacío.
*/
export async function obtenerNotificaciones(idUsuario: number): Promise<Notificacion[]> {
    const datos = await redis.get(`notificaciones:${idUsuario}`);
    if (!datos) {
        return [];
    }
    return JSON.parse(datos) as Notificacion[];
}

/**
* Agrega una notificación al usuario.
* Si ya existe una notificación para el mismo dispositivo,
* no la vuelve a crear.
*/
export async function agregarNotificacion(idUsuario: number, notificacion: Notificacion): Promise<void> {
    try {
        const llave = `notificaciones:${idUsuario}`;

        const notificaciones = await obtenerNotificaciones(idUsuario);

        const existe = notificaciones.some(
            n => n.claveDispositivo === notificacion.claveDispositivo
        );

        if (existe) {
            return;
        }

        notificaciones.unshift(notificacion);

        await redis.set(
            llave,
            JSON.stringify(notificaciones)
        );

    } catch (error) {
        throw error;
    }
}


/**
 * Cambia el estado de atención de una notificación.
 *
 * null  -> true
 * true  -> false
 * false -> true
 */
export async function cambiarAtencionNotificacion(idUsuario: number, clave: string): Promise<void> {
    const llave = `notificaciones:${idUsuario}`;

    const notificaciones = await obtenerNotificaciones(idUsuario);

    const notificacion = notificaciones.find(
        n => n.clave === clave
    );

    if (!notificacion) {
        throw new Error('Notificación no encontrada.');
    }

    if (notificacion.atendida === null) {
        notificacion.atendida = true;
    } else {
        notificacion.atendida = !notificacion.atendida;
    }

    await redis.set(
        llave,
        JSON.stringify(notificaciones)
    );
}


/**
 * Elimina la notificación generada por la desconexión
 * de un dispositivo.
 */
export async function eliminarNotificacionDesconexion(idUsuario: number,claveDispositivo: string): Promise<void> {
    const llave = `notificaciones:${idUsuario}`;

    const notificaciones = await obtenerNotificaciones(idUsuario);

    const indice = notificaciones.findIndex(
        n => n.claveDispositivo === claveDispositivo
    );

    if (indice === -1) {
        return;
    }

    notificaciones.splice(indice, 1);

    await redis.set(
        llave,
        JSON.stringify(notificaciones)
    );
}
