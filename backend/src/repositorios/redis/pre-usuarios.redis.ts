import { redis } from '../../recursos/redis';
import dayjs from 'dayjs';

/**
 * Pre-usuario almacenado temporalmente en Redis mientras
 * confirma su registro por correo.
 */
export interface PreUsuarioRedis {
    clave: string;
    alias: string;
    direccionCorreoElectronico: string;
    telefono: string;
    fechaExpiracion: string;
}

/** Prefijo de las llaves de Redis. */
const PREFIJO_REDIS = 'pre-usuario';

/** Vigencia de un pre-usuario: 24 horas. */
const TTL_SEGUNDOS = 60 * 60 * 24;

/**
 * Obtiene la llave de Redis correspondiente a un pre-usuario.
 */
function obtenerLlave(clave: string): string {
    return `${PREFIJO_REDIS}:${clave}`;
}

/**
 * Crea un nuevo pre-usuario.
 */
export async function crearPreUsuario(datos: Omit<PreUsuarioRedis, 'clave' | 'fechaExpiracion'>): Promise<string> {

    const clave = crypto.randomUUID();

    const preUsuario: PreUsuarioRedis = {
        clave,
        ...datos,
        fechaExpiracion: dayjs()
            .add(TTL_SEGUNDOS, 'second')
            .toISOString()
    };

    const llave = obtenerLlave(clave);

    await redis.set(
        llave,
        JSON.stringify(preUsuario),
        'EX',
        TTL_SEGUNDOS
    );

    return clave;
}

/**
 * Obtiene un pre-usuario por su clave.
 */
export async function obtenerPreUsuarioPorClave(clave: string): Promise<PreUsuarioRedis | null> {

    const datos = await redis.get(obtenerLlave(clave));

    if (!datos) {
        return null;
    }

    return JSON.parse(datos) as PreUsuarioRedis;
}

/**
 * Elimina un pre-usuario por su clave.
 */
export async function eliminarPreUsuario(clave: string): Promise<void> {
    await redis.del(obtenerLlave(clave));
}

/**
 * Obtiene los usuarios por identificados Alias o Direccion de correo electronico o telefono
 */
export async function obtenerPreUsuarioPorIdentificador(identificador: string): Promise<PreUsuarioRedis | null> {

    const valor = identificador.trim().toLowerCase();

    const llaves = await redis.keys(`${PREFIJO_REDIS}:*`);

    for (const llave of llaves) {
        const datos = await redis.get(llave);

        if (!datos) {
            continue;
        }

        const preUsuario = JSON.parse(datos) as PreUsuarioRedis;

        if (
            preUsuario.alias.toLowerCase() === valor ||
            preUsuario.direccionCorreoElectronico.toLowerCase() === valor ||
            preUsuario.telefono.trim() === identificador.trim()
        ) {
            return preUsuario;
        }
    }

    return null;
}