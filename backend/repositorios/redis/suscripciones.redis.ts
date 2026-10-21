
import { redis } from '../../recursos/redis';

/**
 * Agrega una suscripción Web Push al usuario.
 * Si ya existe el mismo endpoint, no la vuelve a agregar.
 */
export async function agregarSuscripcion(
    idUsuario: number,
    suscripcion: any
): Promise<void> {

    const llave = `suscripciones:${idUsuario}`;

    const suscripciones = await obtenerSuscripciones(idUsuario);

    const existe = suscripciones.some(
        s => s.endpoint === suscripcion.endpoint
    );

    if (existe) {
        return;
    }

    suscripciones.push(suscripcion);

    await redis.set(
        llave,
        JSON.stringify(suscripciones)
    );
}

/**
 * Obtiene las suscripciones Web Push de un usuario.
 */
export async function obtenerSuscripciones(
    idUsuario: number
): Promise<any[]> {

    const datos = await redis.get(
        `suscripciones:${idUsuario}`
    );

    if (!datos) {
        return [];
    }

    return JSON.parse(datos);
}

/**
 * Elimina una suscripción Web Push del usuario.
 */
export async function eliminarSuscripcion(
    idUsuario: number,
    endpoint: string
): Promise<void> {

    const llave = `suscripciones:${idUsuario}`;

    const suscripciones = await obtenerSuscripciones(idUsuario);

    const resultado = suscripciones.filter(
        s => s.endpoint !== endpoint
    );

    await redis.set(
        llave,
        JSON.stringify(resultado)
    );
}