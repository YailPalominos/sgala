import { redis } from '../../recursos/redis';
import { v4 as uuidv4 } from 'uuid';


/**
 * Datos de sesión almacenados en Redis.
 *
 * HASH:
 * sesiones:{claveSesion}
 *
 * TTL:
 * 86400 segundos (1 día)
 */
export interface SesionRedis {
    clave: string;
    claveUsuario: string;
    idUsuario: number;
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
 * Crea una nueva sesión para un usuario.
 *
 * La sesión tiene una vigencia de 1 día.
 *
 * Estructura:
 *
 * sesiones:sesion:{idUsuario}
 *     ├── claveSesion1
 *     ├── claveSesion2
 *     └── claveSesion3
 *
 * sesiones:{claveSesion}
 *     ├── clave
 *     ├── claveUsuario
 *     ├── idUsuario
 *     ├── alias
 *     ├── direccionCorreoElectronico
 *     ├── telefono
 *     └── claveSocket
 */
export async function crearSesion(
    claveUsuario: string,
    direccionCorreoElectronico: string,
    alias: string,
    idUsuario: number,
    telefono: string
): Promise<string> {

    try {

        const clave =
            uuidv4();


        /*
         * Crear HASH de la sesión.
         */
        await redis.hset(
            `sesiones:${clave}`,
            {
                clave,

                claveUsuario,

                direccionCorreoElectronico,

                alias,

                claveSocket:
                    'null',

                idUsuario:
                    String(idUsuario),

                telefono
            }
        );


        /*
         * La sesión dura 1 día.
         */
        await redis.expire(
            `sesiones:${clave}`,
            60 * 60 * 24
        );


        /*
         * Registrar la sesión en el índice
         * del usuario.
         */
        await redis.sadd(
            `sesiones:sesion:${idUsuario}`,
            clave
        );


        return clave;

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
 * Obtiene una sesión de un usuario.
 *
 * Primero verifica que la sesión pertenezca
 * al usuario mediante el índice.
 *
 * @param idUsuario - Id del usuario.
 * @param claveSesion - Clave de la sesión.
 */
export async function obtenerSesion(
    idUsuario: number,
    claveSesion: string
): Promise<{
    idUsuario: number;
    alias: string;
} | null> {

    try {

        /*
         * Verificar que la sesión pertenezca
         * al usuario.
         */
        const pertenece =
            await redis.sismember(
                `sesiones:sesion:${idUsuario}`,
                claveSesion
            );


        if (!pertenece) {
            return null;
        }


        /*
         * Obtener la sesión directamente.
         */
        const sesion =
            await redis.hgetall(
                `sesiones:${claveSesion}`
            );


        /*
         * La sesión pudo haber expirado.
         *
         * Limpiamos la referencia que quedó
         * en el índice.
         */
        if (
            !sesion ||
            Object.keys(sesion).length === 0
        ) {

            await redis.srem(
                `sesiones:sesion:${idUsuario}`,
                claveSesion
            );

            return null;
        }


        if (!sesion.idUsuario) {

            throw new Error(
                'La sesión no contiene idUsuario.'
            );
        }


        if (!sesion.alias) {

            throw new Error(
                'La sesión no contiene alias.'
            );
        }


        return {
            idUsuario:
                Number(sesion.idUsuario),

            alias:
                sesion.alias
        };

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
 *
 * Obtiene el idUsuario directamente desde la sesión,
 * por lo que no es necesario recibirlo como parámetro.
 *
 * @param claveSesion - Clave de la sesión.
 */
export async function eliminarSesion(
    claveSesion: string
): Promise<void> {

    try {

        const llaveSesion =
            `sesiones:${claveSesion}`;

        const sesion =
            await redis.hgetall(llaveSesion);

        if (
            !sesion ||
            Object.keys(sesion).length === 0
        ) {
            return;
        }

        if (!sesion.idUsuario) {
            throw new Error(
                'La sesión no contiene idUsuario.'
            );
        }

        const idUsuario =
            Number(sesion.idUsuario);

        await redis.del(
            llaveSesion
        );

        await redis.srem(
            `sesiones:sesion:${idUsuario}`,
            claveSesion
        );

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
 *
 * @param idUsuario - Id del usuario propietario.
 * @param claveSesion - Clave de la sesión.
 * @param claveSocket - Clave del socket.
 */
export async function actualizarClaveSocket(
    idUsuario: number,
    claveSesion: string,
    claveSocket: string
): Promise<void> {

    try {

        /*
         * Verificar que la sesión pertenezca
         * al usuario.
         */
        const pertenece =
            await redis.sismember(
                `sesiones:sesion:${idUsuario}`,
                claveSesion
            );


        if (!pertenece) {

            throw new Error(
                'La sesión no pertenece al usuario.'
            );
        }


        /*
         * Verificar que el HASH todavía exista.
         */
        const existe =
            await redis.exists(
                `sesiones:${claveSesion}`
            );


        if (!existe) {

            /*
             * Limpiar índice obsoleto.
             */
            await redis.srem(
                `sesiones:sesion:${idUsuario}`,
                claveSesion
            );


            throw new Error(
                'La sesión no existe o ha expirado.'
            );
        }


        await redis.hset(
            `sesiones:${claveSesion}`,
            'claveSocket',
            claveSocket
        );

    } catch (error) {

        throw new Error(
            `Error al actualizar el socket de la sesión ${claveSesion}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene todas las claves de socket activas
 * de las sesiones de un usuario.
 *
 * @param idUsuario - Id del usuario.
 * @returns Lista de claves de socket.
 */
export async function obtenerSocketsUsuario(
    idUsuario: number
): Promise<string[]> {

    try {

        /*
         * Obtener las sesiones directamente
         * desde el índice del usuario.
         */
        const clavesSesion =
            await redis.smembers(
                `sesiones:sesion:${idUsuario}`
            );


        if (!clavesSesion) {

            throw new Error(
                `No se pudo obtener el índice de sesiones del usuario ${idUsuario}.`
            );
        }


        if (clavesSesion.length === 0) {
            return [];
        }


        /*
         * Pipeline para obtener todos los sockets
         * en una sola operación de red.
         */
        const pipeline =
            redis.pipeline();


        for (const claveSesion of clavesSesion) {

            pipeline.hget(
                `sesiones:${claveSesion}`,
                'claveSocket'
            );
        }


        const resultados =
            await pipeline.exec();


        if (resultados === null) {

            throw new Error(
                `Redis no devolvió resultados para las sesiones del usuario ${idUsuario}.`
            );
        }


        const sockets: string[] = [];


        for (
            let i = 0;
            i < resultados.length;
            i++
        ) {

            const resultado =
                resultados[i];


            if (
                !resultado ||
                resultado.length < 2
            ) {

                throw new Error(
                    'Redis devolvió un resultado inválido al obtener una clave de socket.'
                );
            }


            const claveSocket =
                resultado[1] as string | null;


            /*
             * Si la sesión expiró mientras
             * realizábamos la consulta,
             * limpiamos el índice.
             */
            if (claveSocket === null) {

                await redis.srem(
                    `sesiones:sesion:${idUsuario}`,
                    clavesSesion[i]
                );

                continue;
            }


            if (
                claveSocket &&
                claveSocket !== 'null'
            ) {

                sockets.push(
                    claveSocket
                );
            }
        }


        return sockets;

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
 * Vigencia:
 * 2 minutos.
 *
 * HASH:
 * llaves:{llave}
 *
 * @param idUsuario - Id del usuario.
 * @param tipo - Tipo de recuperación.
 * @returns Llave generada.
 */
export async function crearLlaveRecuperacion(
    idUsuario: number,
    tipo: string
): Promise<string> {

    try {

        const llave =
            uuidv4();


        await redis.hset(
            `llaves:${llave}`,
            {
                clave:
                    llave,

                tipo,

                idUsuario:
                    String(idUsuario)
            }
        );


        /*
         * La llave dura 2 minutos.
         */
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
 * Obtiene los datos de una llave
 * de recuperación.
 *
 * @param llave - Llave de recuperación.
 * @returns Datos de la llave o null si expiró.
 */
export async function obtenerLlaveRecuperacion(
    llave: string
): Promise<RecuperacionRedis | null> {

    try {

        const datos =
            await redis.hgetall(
                `llaves:${llave}`
            );


        if (
            !datos ||
            Object.keys(datos).length === 0
        ) {

            return null;
        }


        if (!datos.clave) {

            throw new Error(
                'La llave de recuperación no contiene clave.'
            );
        }


        if (!datos.idUsuario) {

            throw new Error(
                'La llave de recuperación no contiene idUsuario.'
            );
        }


        if (!datos.tipo) {

            throw new Error(
                'La llave de recuperación no contiene tipo.'
            );
        }


        return {

            clave:
                datos.clave,

            idUsuario:
                Number(datos.idUsuario),

            tipo:
                datos.tipo
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
 *
 * @param llave - Llave de recuperación.
 */
export async function eliminarLlaveRecuperacion(
    llave: string
): Promise<void> {

    try {

        await redis.del(
            `llaves:${llave}`
        );

    } catch (error) {

        throw new Error(
            `Error al eliminar la llave de recuperación ${llave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}
