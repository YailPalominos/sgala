
import { redis } from '../../recursos/redis';

export interface Alarma {
    clave: string;
    descripcion: string;
    fecha: string;
}

export interface EstadoDispositivoRedis {
    clave: string;
    idUsuario: number;
    alias: string;
    cualidades: string;
    telefono: string;
    estatusConexion: boolean | null;

    localizacion: {
        latitud: number;
        longitud: number;
        altitud: number;
    } | null;

    /** Indica si está activo el corta corriente. */
    estatusCortaCorriente: boolean | null;

    /** Indica si está activa la alarma. */
    estatusAlarma: boolean | null;

    /** Fecha de finalización de la suscripción del dispositivo. */
    fechaFinalSuscripcion: string | null;

    porcentajeBateria: number | null;

    /** 'E' estacionada, 'M' en movimiento, 'P' prendida. */
    estado: 'E' | 'M' | 'P' | null;

    estatusFijarEstacionado: boolean | null;

    alarmas: Alarma[] | null;
}


/**
 * Convierte un HASH de Redis a EstadoDispositivoRedis.
 */
function convertirDispositivo(
    datos: Record<string, string>
): EstadoDispositivoRedis {

    if (!datos.clave) {
        throw new Error(
            'El dispositivo no contiene una clave válida.'
        );
    }

    if (!datos.idUsuario) {
        throw new Error(
            `El dispositivo ${datos.clave} no contiene idUsuario.`
        );
    }

    return {
        clave: datos.clave,

        idUsuario: Number(datos.idUsuario),

        alias: datos.alias ?? '',

        cualidades: datos.cualidades ?? '',

        telefono: datos.telefono ?? '',

        estatusConexion:
            !datos.estatusConexion ||
                datos.estatusConexion === 'null'
                ? null
                : datos.estatusConexion === 'true',

        localizacion:
            !datos.localizacion ||
                datos.localizacion === 'null'
                ? null
                : JSON.parse(datos.localizacion),

        estatusAlarma:
            !datos.estatusAlarma ||
                datos.estatusAlarma === 'null'
                ? null
                : datos.estatusAlarma === 'true',

        estatusCortaCorriente:
            !datos.estatusCortaCorriente ||
                datos.estatusCortaCorriente === 'null'
                ? null
                : datos.estatusCortaCorriente === 'true',

        fechaFinalSuscripcion:
            !datos.fechaFinalSuscripcion ||
                datos.fechaFinalSuscripcion === 'null'
                ? null
                : datos.fechaFinalSuscripcion,

        porcentajeBateria:
            !datos.porcentajeBateria ||
                datos.porcentajeBateria === 'null'
                ? null
                : Number(datos.porcentajeBateria),

        estado:
            !datos.estado ||
                datos.estado === 'null'
                ? null
                : datos.estado as 'E' | 'M' | 'P',

        estatusFijarEstacionado:
            !datos.estatusFijarEstacionado ||
                datos.estatusFijarEstacionado === 'null'
                ? null
                : datos.estatusFijarEstacionado === 'true',

        alarmas:
            !datos.alarmas ||
                datos.alarmas === 'null'
                ? null
                : JSON.parse(datos.alarmas)
    };
}


/**
 * Obtiene todas las claves de dispositivos utilizando SCAN.
 *
 * No utiliza KEYS para evitar bloquear Redis.
 */
async function obtenerClavesDispositivos(): Promise<string[]> {

    try {

        const claves: string[] = [];

        let cursor = '0';

        do {

            const resultado = await redis.scan(
                cursor,
                'MATCH',
                'dispositivos:*',
                'COUNT',
                500
            );

            if (!resultado || resultado.length < 2) {
                throw new Error(
                    'Redis no devolvió un resultado válido al buscar dispositivos.'
                );
            }

            cursor = resultado[0];

            if (Array.isArray(resultado[1])) {
                claves.push(...resultado[1]);
            }

        } while (cursor !== '0');

        return claves.filter(
            clave =>
                !clave.startsWith(
                    'dispositivos:dispositivo:'
                )
        );

    } catch (error) {

        throw new Error(
            `Error al obtener las claves de dispositivos: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Reemplaza el estado de todos los dispositivos en Redis.
 *
 * Elimina los estados anteriores y guarda los nuevos.
 *
 * También reconstruye los índices:
 *
 * dispositivos:dispositivo:{idUsuario}
 *
 * Los valores null se almacenan como "null".
 */
export async function guardarEstadosDispositivos(
    dispositivos: EstadoDispositivoRedis[]
): Promise<void> {

    try {

        const clavesActuales: string[] = [];

        let cursor = '0';

        do {

            const resultado = await redis.scan(
                cursor,
                'MATCH',
                'dispositivos:*',
                'COUNT',
                500
            );

            if (!resultado || resultado.length < 2) {
                throw new Error(
                    'Redis no devolvió un resultado válido al obtener los dispositivos actuales.'
                );
            }

            cursor = resultado[0];

            if (Array.isArray(resultado[1])) {
                clavesActuales.push(...resultado[1]);
            }

        } while (cursor !== '0');


        /*
         * Eliminar dispositivos e índices anteriores.
         */
        if (clavesActuales.length > 0) {

            await redis.del(
                ...clavesActuales
            );
        }


        /*
         * No hay dispositivos nuevos.
         */
        if (dispositivos.length === 0) {
            return;
        }


        /*
         * Pipeline para guardar los dispositivos
         * y sus índices.
         */
        const pipeline =
            redis.pipeline();


        for (const dispositivo of dispositivos) {

            const claveRedis =
                `dispositivos:${dispositivo.clave}`;


            /*
             * Guardar HASH del dispositivo.
             */
            pipeline.hset(
                claveRedis,
                {
                    clave:
                        dispositivo.clave,

                    idUsuario:
                        String(dispositivo.idUsuario),

                    alias:
                        dispositivo.alias,

                    cualidades:
                        dispositivo.cualidades,

                    telefono:
                        dispositivo.telefono,

                    estatusConexion:
                        String(
                            dispositivo.estatusConexion ?? null
                        ),

                    localizacion:
                        JSON.stringify(
                            dispositivo.localizacion ?? null
                        ),

                    estatusAlarma:
                        String(
                            dispositivo.estatusAlarma ?? null
                        ),

                    estatusCortaCorriente:
                        String(
                            dispositivo.estatusCortaCorriente ?? null
                        ),

                    fechaFinalSuscripcion:
                        String(
                            dispositivo.fechaFinalSuscripcion ?? null
                        ),

                    porcentajeBateria:
                        String(
                            dispositivo.porcentajeBateria ?? null
                        ),

                    estado:
                        String(
                            dispositivo.estado ?? null
                        ),

                    estatusFijarEstacionado:
                        String(
                            dispositivo.estatusFijarEstacionado ?? null
                        ),

                    alarmas:
                        JSON.stringify(
                            dispositivo.alarmas ?? null
                        )
                }
            );


            /*
             * Índice por usuario.
             */
            pipeline.sadd(
                `dispositivos:dispositivo:${dispositivo.idUsuario}`,
                dispositivo.clave
            );
        }


        const resultados =
            await pipeline.exec();


        if (resultados === null) {
            throw new Error(
                'Redis no devolvió resultados al guardar los dispositivos.'
            );
        }

    } catch (error) {

        throw new Error(
            `Error al guardar los estados de los dispositivos: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene el estado completo de un dispositivo.
 *
 * @param clave - Clave del dispositivo.
 */
export async function obtenerDispositivo(
    clave: string
): Promise<EstadoDispositivoRedis> {

    try {

        const datos =
            await redis.hgetall(
                `dispositivos:${clave}`
            );


        if (
            !datos ||
            Object.keys(datos).length === 0
        ) {

            throw new Error(
                'Dispositivo no encontrado.'
            );
        }


        return convertirDispositivo(datos);

    } catch (error) {

        throw new Error(
            `Error al obtener el dispositivo ${clave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Agrega una alarma al dispositivo.
 *
 * @param clave - Clave del dispositivo.
 * @param alarma - Información de la alarma.
 */
export async function agregarAlarma(
    clave: string,
    alarma: Alarma
): Promise<void> {

    try {

        const llave =
            `dispositivos:${clave}`;


        const existe =
            await redis.exists(llave);


        if (!existe) {

            throw new Error(
                'Dispositivo no encontrado.'
            );
        }


        const datos =
            await redis.hget(
                llave,
                'alarmas'
            );


        const alarmas: Alarma[] =
            !datos ||
                datos === 'null'
                ? []
                : JSON.parse(datos);


        alarmas.push({
            clave: alarma.clave,
            descripcion: alarma.descripcion,
            fecha: alarma.fecha
        });


        await redis.hset(
            llave,
            'alarmas',
            JSON.stringify(alarmas)
        );

    } catch (error) {

        throw new Error(
            `Error al agregar la alarma al dispositivo ${clave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene todos los dispositivos sin conexión.
 *
 * Se consideran sin conexión:
 *
 * null
 * false
 */
export async function obtenerDispositivosSinConexion():
    Promise<EstadoDispositivoRedis[]> {

    try {

        const claves =
            await obtenerClavesDispositivos();


        if (claves.length === 0) {
            return [];
        }


        const pipeline =
            redis.pipeline();


        for (const clave of claves) {

            pipeline.hgetall(clave);
        }


        const resultados =
            await pipeline.exec();


        if (resultados === null) {

            throw new Error(
                'Redis no devolvió resultados al consultar los dispositivos.'
            );
        }


        const dispositivos:
            EstadoDispositivoRedis[] = [];


        for (const resultado of resultados) {

            if (
                !resultado ||
                resultado.length < 2
            ) {

                throw new Error(
                    'Redis devolvió un resultado inválido al consultar un dispositivo.'
                );
            }


            const datos =
                resultado[1] as Record<string, string>;


            if (
                !datos ||
                Object.keys(datos).length === 0
            ) {

                throw new Error(
                    'No se encontraron datos de un dispositivo.'
                );
            }


            const dispositivo =
                convertirDispositivo(datos);


            if (
                dispositivo.estatusConexion !== true
            ) {

                dispositivos.push(
                    dispositivo
                );
            }
        }


        return dispositivos;

    } catch (error) {

        throw new Error(
            `Error al obtener los dispositivos sin conexión: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Obtiene todos los dispositivos asociados
 * a un usuario.
 *
 * Utiliza el índice:
 *
 * dispositivos:dispositivo:{idUsuario}
 *
 * y después obtiene directamente cada HASH.
 */
export async function obtenerDispositivosUsuario(
    idUsuario: number
): Promise<EstadoDispositivoRedis[]> {

    try {

        const claves =
            await redis.smembers(
                `dispositivos:dispositivo:${idUsuario}`
            );


        if (!claves) {

            throw new Error(
                `No se pudo obtener el índice de dispositivos del usuario ${idUsuario}.`
            );
        }


        if (claves.length === 0) {
            return [];
        }


        const pipeline =
            redis.pipeline();


        for (const clave of claves) {

            pipeline.hgetall(
                `dispositivos:${clave}`
            );
        }


        const resultados =
            await pipeline.exec();


        if (resultados === null) {

            throw new Error(
                `Redis no devolvió resultados para los dispositivos del usuario ${idUsuario}.`
            );
        }


        const dispositivos:
            EstadoDispositivoRedis[] = [];


        for (const resultado of resultados) {

            if (
                !resultado ||
                resultado.length < 2
            ) {

                throw new Error(
                    'Redis devolvió un resultado inválido al consultar un dispositivo.'
                );
            }


            const datos =
                resultado[1] as Record<string, string>;


            if (
                !datos ||
                Object.keys(datos).length === 0
            ) {

                throw new Error(
                    'Un dispositivo registrado en el índice no existe en Redis.'
                );
            }


            dispositivos.push(
                convertirDispositivo(datos)
            );
        }


        return dispositivos;

    } catch (error) {

        throw new Error(
            `Error al obtener los dispositivos del usuario ${idUsuario}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Actualiza únicamente el estado de conexión
 * de un dispositivo.
 *
 * @param clave - Clave del dispositivo.
 * @param estatusConexion - Estado de conexión.
 */
export async function actualizarEstatusConexion(
    clave: string,
    estatusConexion: boolean
): Promise<void> {

    try {

        const llave =
            `dispositivos:${clave.toUpperCase()}`;


        const existe =
            await redis.exists(llave);


        if (!existe) {

            throw new Error(
                'Dispositivo no encontrado.'
            );
        }


        await redis.hset(
            llave,
            'estatusConexion',
            String(estatusConexion)
        );

    } catch (error) {

        throw new Error(
            `Error al actualizar el estado de conexión del dispositivo ${clave}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Actualiza únicamente los datos enviados
 * de un dispositivo.
 *
 * undefined:
 * No modifica el campo.
 *
 * null:
 * Almacena la cadena "null".
 */
export async function actualizarDatosDispositivo(
    claveDispositivo: string,
    datos: any
): Promise<void> {

    try {

        const llave =
            `dispositivos:${claveDispositivo}`;


        const existe =
            await redis.exists(llave);


        if (!existe) {

            throw new Error(
                'Dispositivo no encontrado.'
            );
        }


        const actualizacion:
            Record<string, string> = {};


        const campos = [
            'alias',
            'telefono',
            'estatusAlarma',
            'estatusCortaCorriente',
            'fechaFinalSuscripcion',
            'porcentajeBateria',
            'estado',
            'localizacion',
            'estatusFijarEstacionado'
        ] as const;


        for (const campo of campos) {

            if (!(campo in datos)) {
                continue;
            }


            const valor =
                datos[campo];


            if (valor === null) {

                actualizacion[campo] =
                    'null';

                continue;
            }


            if (campo === 'localizacion') {

                actualizacion[campo] =
                    JSON.stringify(valor);

                continue;
            }


            actualizacion[campo] =
                String(valor);
        }


        if (
            Object.keys(actualizacion).length === 0
        ) {

            return;
        }


        await redis.hset(
            llave,
            actualizacion
        );

    } catch (error) {

        throw new Error(
            `Error al actualizar el dispositivo ${claveDispositivo}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}
