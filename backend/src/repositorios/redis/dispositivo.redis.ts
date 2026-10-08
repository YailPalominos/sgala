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
    estatusConexion: boolean | null;
    localizacion: {
        latitud: number;
        longitud: number;
        altitud: number;
    } | null;
    /** Indica el estatus general del dispositivo, Interruptor(I). */
    estatus: boolean | null;
    /** Indica si está activo el corta corriente. */
    estatusCortaCorriente: boolean | null;
    /** Indica si está activa la alarma. */
    estatusAlarma: boolean | null;
    /** Fecha de finalización de la suscripción del dispositivo. */
    fechaFinalSuscripcion: string | null;
    porcentajeBateria: number | null;
    /** Indica si el dispositivo está encendido. */
    estatusEncendida: boolean | null;
    /** Indica si el dispositivo está en movimiento. */
    estatusMovimiento: boolean | null;
    estatusFijarEstacionado: boolean | null;
    alarmas: Alarma[] | null;
}


/**
 * Obtiene todos los dispositivos de un usuario.
 *
 * Estructura:
 * dispositivos:{idUsuario} → JSON string con array de dispositivos
 */
export async function obtenerDispositivosUsuario(
    idUsuario: number
): Promise<EstadoDispositivoRedis[]> {

    try {

        const datos = await redis.get(
            `dispositivos:${idUsuario}`
        );

        if (!datos) {
            return [];
        }

        return JSON.parse(datos) as EstadoDispositivoRedis[];

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
 * Obtiene un dispositivo específico por su clave.
 *
 * Busca en todos los usuarios hasta encontrarlo.
 * Si se conoce el idUsuario, usar obtenerDispositivoDeUsuario.
 */
export async function obtenerDispositivo(
    clave: string
): Promise<EstadoDispositivoRedis> {

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

            const dispositivos: EstadoDispositivoRedis[] =
                JSON.parse(datos);

            const dispositivo = dispositivos.find(
                d => d.clave.toUpperCase() === clave.toUpperCase()
            );

            if (dispositivo) {
                return dispositivo;
            }
        }

        throw new Error('Dispositivo no encontrado.');

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
 * Obtiene un dispositivo de un usuario específico.
 */
export async function obtenerDispositivoDeUsuario(
    idUsuario: number,
    clave: string
): Promise<EstadoDispositivoRedis | null> {

    const dispositivos = await obtenerDispositivosUsuario(idUsuario);

    return dispositivos.find(
        d => d.clave.toUpperCase() === clave.toUpperCase()
    ) ?? null;
}


/**
 * Guarda todos los dispositivos en Redis.
 *
 * Agrupa por idUsuario y guarda cada grupo
 * en su llave correspondiente.
 *
 * Elimina las llaves anteriores primero.
 */
export async function guardarEstadosDispositivos(
    dispositivos: EstadoDispositivoRedis[]
): Promise<void> {

    try {

        /*
         * Eliminar todas las llaves de dispositivos actuales.
         */
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

            cursor = resultado[0];

            if (Array.isArray(resultado[1])) {
                clavesActuales.push(...resultado[1]);
            }

        } while (cursor !== '0');

        if (clavesActuales.length > 0) {
            await redis.del(...clavesActuales);
        }

        if (dispositivos.length === 0) {
            return;
        }


        /*
         * Agrupar dispositivos por idUsuario.
         */
        const porUsuario = new Map<number, EstadoDispositivoRedis[]>();

        for (const dispositivo of dispositivos) {

            const lista = porUsuario.get(dispositivo.idUsuario) ?? [];
            lista.push(dispositivo);
            porUsuario.set(dispositivo.idUsuario, lista);
        }


        /*
         * Guardar cada grupo en su llave.
         */
        const pipeline = redis.pipeline();

        for (const [idUsuario, listaDispositivos] of porUsuario) {

            pipeline.set(
                `dispositivos:${idUsuario}`,
                JSON.stringify(listaDispositivos)
            );
        }

        await pipeline.exec();

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
 * Agrega una alarma a un dispositivo.
 */
export async function agregarAlarma(
    clave: string,
    alarma: Alarma
): Promise<void> {

    try {

        const dispositivo = await obtenerDispositivo(clave);

        const llaveRedis = `dispositivos:${dispositivo.idUsuario}`;

        const datos = await redis.get(llaveRedis);

        if (!datos) {
            throw new Error('Dispositivo no encontrado.');
        }

        const dispositivos: EstadoDispositivoRedis[] =
            JSON.parse(datos);

        const indice = dispositivos.findIndex(
            d => d.clave.toUpperCase() === clave.toUpperCase()
        );

        if (indice === -1) {
            throw new Error('Dispositivo no encontrado.');
        }

        const alarmas = dispositivos[indice].alarmas ?? [];

        const yaExiste = alarmas.some(
            a => a.descripcion === alarma.descripcion
        );

        if (yaExiste) {
            return;
        }

        alarmas.push({
            clave: alarma.clave,
            descripcion: alarma.descripcion,
            fecha: alarma.fecha
        });

        dispositivos[indice].alarmas = alarmas;

        await redis.set(
            llaveRedis,
            JSON.stringify(dispositivos)
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
 * Elimina una alarma específica de un dispositivo por su clave.
 */
export async function eliminarAlarma(
    claveDispositivo: string,
    claveAlarma: string
): Promise<void> {

    try {

        const dispositivo = await obtenerDispositivo(claveDispositivo);

        const llaveRedis = `dispositivos:${dispositivo.idUsuario}`;

        const datos = await redis.get(llaveRedis);

        if (!datos) {
            throw new Error('Dispositivo no encontrado.');
        }

        const dispositivos: EstadoDispositivoRedis[] =
            JSON.parse(datos);

        const indice = dispositivos.findIndex(
            d => d.clave.toUpperCase() === claveDispositivo.toUpperCase()
        );

        if (indice === -1) {
            throw new Error('Dispositivo no encontrado.');
        }

        const alarmas = dispositivos[indice].alarmas ?? [];

        const indiceAlarma = alarmas.findIndex(
            a => a.clave === claveAlarma
        );

        if (indiceAlarma === -1) {
            throw new Error('Alarma no encontrada.');
        }

        alarmas.splice(indiceAlarma, 1);

        dispositivos[indice].alarmas = alarmas.length > 0 ? alarmas : null;

        await redis.set(
            llaveRedis,
            JSON.stringify(dispositivos)
        );

    } catch (error) {

        throw new Error(
            `Error al eliminar la alarma del dispositivo ${claveDispositivo}: ${error instanceof Error
                ? error.message
                : String(error)
            }`
        );
    }
}


/**
 * Elimina todas las alarmas de desconexión de un dispositivo.
 * Retorna las claves de las alarmas eliminadas.
 */
export async function eliminarAlarmasDesconexion(
    claveDispositivo: string
): Promise<string[]> {

    try {

        const dispositivo = await obtenerDispositivo(claveDispositivo);

        const llaveRedis = `dispositivos:${dispositivo.idUsuario}`;

        const datos = await redis.get(llaveRedis);

        if (!datos) {
            return [];
        }

        const dispositivos: EstadoDispositivoRedis[] =
            JSON.parse(datos);

        const indice = dispositivos.findIndex(
            d => d.clave.toUpperCase() === claveDispositivo.toUpperCase()
        );

        if (indice === -1) {
            return [];
        }

        const alarmas = dispositivos[indice].alarmas ?? [];

        const alarmasDesconexion = alarmas.filter(
            a => a.descripcion.includes('sin conexión')
        );

        const clavesEliminadas = alarmasDesconexion.map(a => a.clave);

        dispositivos[indice].alarmas = alarmas.filter(
            a => !a.descripcion.includes('sin conexión')
        );

        if (dispositivos[indice].alarmas!.length === 0) {
            dispositivos[indice].alarmas = null;
        }

        await redis.set(
            llaveRedis,
            JSON.stringify(dispositivos)
        );

        return clavesEliminadas;

    } catch (error) {
        return [];
    }
}


/**
 * Obtiene todos los dispositivos sin conexión.
 *
 * Se consideran sin conexión: null o false.
 */
export async function obtenerDispositivosSinConexion():
    Promise<EstadoDispositivoRedis[]> {

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

            cursor = resultado[0];

            if (Array.isArray(resultado[1])) {
                claves.push(...resultado[1]);
            }

        } while (cursor !== '0');

        const sinConexion: EstadoDispositivoRedis[] = [];

        for (const llaveRedis of claves) {

            const datos = await redis.get(llaveRedis);

            if (!datos) {
                continue;
            }

            const dispositivos: EstadoDispositivoRedis[] =
                JSON.parse(datos);

            for (const dispositivo of dispositivos) {
                if (dispositivo.estatusConexion !== true) {
                    sinConexion.push(dispositivo);
                }
            }
        }

        return sinConexion;

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
 * Actualiza el estado de conexión de un dispositivo.
 */
export async function actualizarEstatusConexion(
    clave: string,
    estatusConexion: boolean
): Promise<void> {

    try {

        const dispositivo = await obtenerDispositivo(clave);

        const llaveRedis = `dispositivos:${dispositivo.idUsuario}`;

        const datos = await redis.get(llaveRedis);

        if (!datos) {
            throw new Error('Dispositivo no encontrado.');
        }

        const dispositivos: EstadoDispositivoRedis[] =
            JSON.parse(datos);

        const indice = dispositivos.findIndex(
            d => d.clave.toUpperCase() === clave.toUpperCase()
        );

        if (indice === -1) {
            throw new Error('Dispositivo no encontrado.');
        }

        dispositivos[indice].estatusConexion = estatusConexion;

        await redis.set(
            llaveRedis,
            JSON.stringify(dispositivos)
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
 * Actualiza los datos de un dispositivo.
 *
 * Solo modifica los campos presentes en `datos`.
 * null almacena null, undefined no modifica.
 */
export async function actualizarDatosDispositivo(
    claveDispositivo: string,
    datos: any
): Promise<void> {

    try {

        const dispositivo = await obtenerDispositivo(claveDispositivo);

        const llaveRedis = `dispositivos:${dispositivo.idUsuario}`;

        const contenido = await redis.get(llaveRedis);

        if (!contenido) {
            throw new Error('Dispositivo no encontrado.');
        }

        const dispositivos: EstadoDispositivoRedis[] =
            JSON.parse(contenido);

        const indice = dispositivos.findIndex(
            d => d.clave.toUpperCase() === claveDispositivo.toUpperCase()
        );

        if (indice === -1) {
            throw new Error('Dispositivo no encontrado.');
        }

        const campos = [
            'alias',
            'estatusAlarma',
            'estatusCortaCorriente',
            'fechaFinalSuscripcion',
            'porcentajeBateria',
            'estatusEncendida',
            'estatusMovimiento',
            'localizacion',
            'estatusFijarEstacionado',
            'estatus'
        ] as const;

        for (const campo of campos) {

            if (!(campo in datos)) {
                continue;
            }

            (dispositivos[indice] as any)[campo] = datos[campo];
        }

        await redis.set(
            llaveRedis,
            JSON.stringify(dispositivos)
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
