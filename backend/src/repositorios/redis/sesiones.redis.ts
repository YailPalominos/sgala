import { redis } from '../../recursos/redis';
import { v4 as uuidv4 } from 'uuid';


/**
 * Datos de sesión almacenados en Redis.
 *
 * Estructura:
 * sesiones:{idUsuario} → JSON string con array de sesiones
 *
 * TTL:
 * 86400 segundos (1 día)
 */
export interface SesionRedis {
    clave: string;
    claveUsuario: string;
    idUsuario: number;
    tipoCuenta?: 'usuario' | 'administrador';
    alias: string;
    direccionCorreoElectronico: string;
    telefono: string;
    claveSocket?: string;
}


/**
 * Datos de llave de recuperación almacenados en Redis.
 *
 * HASH:
 * llaves:{llave}
 *
 * TTL:
 * 120 segundos (2 minutos)
 */
export interface RecuperacionRedis {
    clave: string;
    idUsuario: number;
    tipo: string;
}


/**
 * Obtiene todas las sesiones de un usuario.
 */
async function obtenerSesiones(
    idUsuario: number
): Promise<SesionRedis[]> {

    const datos = await redis.get(
        `sesiones:${idUsuario}`
    );

    if (!datos) {
        return [];
    }

    return JSON.parse(datos) as SesionRedis[];
}


/**
 * Guarda todas las sesiones de un usuario.
 */
async function guardarSesiones(
    idUsuario: number,
    sesiones: SesionRedis[]
): Promise<void> {

    if (sesiones.length === 0) {
        await redis.del(`sesiones:${idUsuario}`);
        return;
    }

    await redis.set(
        `sesiones:${idUsuario}`,
        JSON.stringify(sesiones)
    );

    /*
     * La llave del usuario expira en 1 día.
     * Se renueva cada vez que se modifica.
     */
    await redis.expire(
        `sesiones:${idUsuario}`,
        60 * 60 * 24
    );
}


/**
 * Crea una nueva sesión para un usuario.
 *
 * La sesión se agrega al array del usuario.
 */
export async function crearSesion(
    clave: string,
    direccionCorreoElectronico: string,
    alias: string,
    idUsuario: number,
    telefono: string,
    tipoCuenta: 'usuario' | 'administrador' = 'usuario'
): Promise<SesionRedis> {

    try {

        const claveSesion = uuidv4();

        const sesion: SesionRedis = {
            clave: claveSesion,
            claveUsuario: clave,
            idUsuario,
            tipoCuenta,
            alias,
            direccionCorreoElectronico,
            telefono,
            claveSocket: undefined
        };

        const sesiones = await obtenerSesiones(idUsuario);

        sesiones.push(sesion);

        await guardarSesiones(idUsuario, sesiones);

        return sesion;

    } catch (error) {

        throw new Error(
            `Error al crear la sesión: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene una sesión por su clave dentro
 * de las sesiones de un usuario.
 */
export async function obtenerSesion(
    idUsuario: number,
    claveSesion: string
): Promise<SesionRedis | null> {

    try {

        const sesiones = await obtenerSesiones(idUsuario);

        const sesion = sesiones.find(
            s => s.clave === claveSesion
        );

        return sesion ?? null;

    } catch (error) {

        throw new Error(
            `Error al obtener la sesión ${claveSesion}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene una sesión buscando por clave
 * sin conocer el idUsuario.
 *
 * Busca en todas las llaves sesiones:*.
 */
export async function obtenerSesionPorClave(
    claveSesion: string
): Promise<SesionRedis | null> {

    try {

        const claves: string[] = [];
        let cursor = '0';

        do {
            const resultado = await redis.scan(
                cursor,
                'MATCH',
                'sesiones:*',
                'COUNT',
                500
            );

            cursor = resultado[0];

            if (Array.isArray(resultado[1])) {
                claves.push(...resultado[1]);
            }

        } while (cursor !== '0');

        for (const llaveRedis of claves) {

            const datos = await redis.get(llaveRedis);

            if (!datos) {
                continue;
            }

            const sesiones: SesionRedis[] = JSON.parse(datos);

            const sesion = sesiones.find(
                s => s.clave === claveSesion
            );

            if (sesion) {
                return sesion;
            }
        }

        return null;

    } catch (error) {

        throw new Error(
            `Error al obtener la sesión ${claveSesion}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Elimina una sesión de Redis.
 */
export async function eliminarSesion(
    claveSesion: string
): Promise<void> {

    try {

        const sesion = await obtenerSesionPorClave(claveSesion);

        if (!sesion) {
            return;
        }

        const sesiones = await obtenerSesiones(sesion.idUsuario);

        const filtradas = sesiones.filter(
            s => s.clave !== claveSesion
        );

        await guardarSesiones(sesion.idUsuario, filtradas);

    } catch (error) {

        throw new Error(
            `Error al eliminar la sesión ${claveSesion}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Actualiza la clave del socket de una sesión.
 */
export async function actualizarClaveSocket(
    idUsuario: number,
    claveSesion: string,
    claveSocket: string
): Promise<void> {

    try {

        const sesiones = await obtenerSesiones(idUsuario);

        const indice = sesiones.findIndex(
            s => s.clave === claveSesion
        );

        if (indice === -1) {
            throw new Error(
                'La sesión no pertenece al usuario o no existe.'
            );
        }

        sesiones[indice].claveSocket = claveSocket;

        await guardarSesiones(idUsuario, sesiones);

    } catch (error) {

        throw new Error(
            `Error al actualizar el socket de la sesión ${claveSesion}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}

export async function actualizarPerfilSesion(
    idUsuario: number,
    claveSesion: string,
    datos: Pick<SesionRedis, 'alias' | 'direccionCorreoElectronico'>
): Promise<void> {
    const sesiones = await obtenerSesiones(idUsuario);
    const sesion = sesiones.find((actual) => actual.clave === claveSesion);
    if (!sesion) {
        throw new Error('La sesión del administrador no existe.');
    }
    sesion.alias = datos.alias;
    sesion.direccionCorreoElectronico = datos.direccionCorreoElectronico;
    await guardarSesiones(idUsuario, sesiones);
}


/**
 * Limpia la clave de socket de la sesión que tenga ese socketId.
 * Pone claveSocket en null para que no reciba notificaciones.
 */
export async function limpiarClaveSocket(
    idUsuario: number,
    socketId: string
): Promise<void> {

    try {

        const sesiones = await obtenerSesiones(idUsuario);

        let modificado = false;

        for (const sesion of sesiones) {
            if (sesion.claveSocket === socketId) {
                sesion.claveSocket = undefined;
                modificado = true;
            }
        }

        if (modificado) {
            await guardarSesiones(idUsuario, sesiones);
        }

    } catch (error) {

        throw new Error(
            `Error al limpiar el socket del usuario ${idUsuario}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene todas las claves de socket activas
 * de las sesiones de un usuario.
 */
export async function obtenerSocketsUsuario(
    idUsuario: number
): Promise<string[]> {

    try {

        const sesiones = await obtenerSesiones(idUsuario);

        return sesiones
            .map(s => s.claveSocket)
            .filter(
                (socket): socket is string =>
                    socket !== undefined &&
                    socket !== null &&
                    socket !== 'null' &&
                    socket !== ''
            );

    } catch (error) {

        throw new Error(
            `Error al obtener los sockets del usuario ${idUsuario}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Crea una llave de recuperación.
 *
 * Vigencia: 2 minutos.
 *
 * HASH: llaves:{llave}
 */
export async function crearLlaveRecuperacion(
    idUsuario: number,
    tipo: string
): Promise<string> {

    try {

        const llave = uuidv4();

        await redis.hset(
            `llaves:${llave}`,
            {
                clave: llave,
                tipo,
                idUsuario: String(idUsuario)
            }
        );

        await redis.expire(
            `llaves:${llave}`,
            120
        );

        return llave;

    } catch (error) {

        throw new Error(
            `Error al crear la llave de recuperación: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene los datos de una llave de recuperación.
 */
export async function obtenerLlaveRecuperacion(
    llave: string
): Promise<RecuperacionRedis | null> {

    try {

        const datos = await redis.hgetall(
            `llaves:${llave}`
        );

        if (!datos || Object.keys(datos).length === 0) {
            return null;
        }

        if (!datos.clave || !datos.idUsuario || !datos.tipo) {
            throw new Error(
                'La llave de recuperación tiene datos incompletos.'
            );
        }

        return {
            clave: datos.clave,
            idUsuario: Number(datos.idUsuario),
            tipo: datos.tipo
        };

    } catch (error) {

        throw new Error(
            `Error al obtener la llave de recuperación ${llave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Elimina una llave de recuperación de Redis.
 */
export async function eliminarLlaveRecuperacion(
    llave: string
): Promise<void> {

    try {

        await redis.del(`llaves:${llave}`);

    } catch (error) {

        throw new Error(
            `Error al eliminar la llave de recuperación ${llave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}
