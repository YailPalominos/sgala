
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { redis } from '../../recursos/redis';

/**
 * Cambio de datos de usuario almacenado temporalmente en Redis.
 */
export interface PreCambioUsuarioRedis {
    claveUsuario: string;

    direccionCorreoElectronico?: string;
    telefono?: string;

    claveVerificacionDireccionCorreoElectronico?: string;
    verificacionDireccionCorreoElectronico: boolean;

    claveVerificacionTelefono?: string;
    verificacionTelefono: boolean;

    fechaExpiracion: string;
}

/** Prefijo de las llaves de Redis. */
const PREFIJO_REDIS = 'pre-cambio';

/** Vigencia: 24 horas. */
const TTL_SEGUNDOS = 60 * 60 * 24;

/**
 * Obtiene la llave Redis correspondiente a una verificación.
 */
function obtenerLlave(clave: string): string {
    return `${PREFIJO_REDIS}:${clave}`;
}

/**
 * Guarda el mismo cambio bajo todas sus claves de verificación.
 */
async function guardarPreCambio(cambio: PreCambioUsuarioRedis, ttl: number = TTL_SEGUNDOS): Promise<void> {
    const datos = JSON.stringify(cambio);

    const claves = [
        cambio.claveVerificacionDireccionCorreoElectronico,
        cambio.claveVerificacionTelefono
    ].filter((clave): clave is string => Boolean(clave));

    for (const clave of claves) {
        await redis.set(obtenerLlave(clave), datos, 'EX', ttl);
    }
}

/**
 * Crea una solicitud de cambio de correo, teléfono o ambos.
 */
export async function crearPreCambio(
    datos: {
        claveUsuario: string;
        direccionCorreoElectronico?: string;
        telefono?: string;
    }
): Promise<{
    claveVerificacionDireccionCorreoElectronico?: string;
    claveVerificacionTelefono?: string;
}> {
    const cambiaCorreo =
        datos.direccionCorreoElectronico !== undefined;

    const cambiaTelefono =
        datos.telefono !== undefined;

    if (!cambiaCorreo && !cambiaTelefono) {
        throw new Error('No se proporcionaron cambios para verificar.');
    }

    const cambio: PreCambioUsuarioRedis = {
        claveUsuario: datos.claveUsuario,

        ...(cambiaCorreo && {
            direccionCorreoElectronico: datos.direccionCorreoElectronico,
            claveVerificacionDireccionCorreoElectronico: randomUUID()
        }),

        ...(cambiaTelefono && {
            telefono: datos.telefono,
            claveVerificacionTelefono: randomUUID()
        }),

        // Si un dato no cambia, su verificación no es necesaria.
        verificacionDireccionCorreoElectronico: !cambiaCorreo,
        verificacionTelefono: !cambiaTelefono,

        fechaExpiracion: dayjs()
            .add(TTL_SEGUNDOS, 'second')
            .toISOString()
    };

    await guardarPreCambio(cambio);

    return {
        claveVerificacionDireccionCorreoElectronico:
            cambio.claveVerificacionDireccionCorreoElectronico,

        claveVerificacionTelefono:
            cambio.claveVerificacionTelefono
    };
}


export async function eliminarPreCambioPorUsuario(
    claveUsuario: string
): Promise<boolean> {
    const llaves = await redis.keys(`${PREFIJO_REDIS}:*`);

    let eliminado = false;

    for (const llave of llaves) {
        const datos = await redis.get(llave);

        if (!datos) {
            continue;
        }

        const cambio = JSON.parse(datos) as PreCambioUsuarioRedis;

        if (cambio.claveUsuario === claveUsuario) {
            await redis.del(llave);
            eliminado = true;
        }
    }

    return eliminado;
}


export async function obtenerDatosPreCambioPorCodigo(codigo: string): Promise<any> {

    const datos = await redis.get(
        obtenerLlave(codigo)
    );

    if (!datos) {
        return null
    }

    return JSON.parse(datos) as any;
}
/**
 * Confirma una verificación y determina si el pre-cambio está completo.
 */
export async function confirmarPreCambio(
    codigo: string,
    tipo: 'correo' | 'telefono'
): Promise<{
    estaFinalizado: boolean;
    verificacionPendiente: ('correo' | 'telefono')[];
    datos: PreCambioUsuarioRedis | null;
}> {

    const llave = obtenerLlave(codigo);
    const contenido = await redis.get(llave);

    if (!contenido) {
        throw new Error(
            'El código de verificación no existe o ha expirado.'
        );
    }

    const cambio = JSON.parse(contenido) as PreCambioUsuarioRedis;
    const ttl = await redis.ttl(llave);

    if (ttl <= 0) {
        throw new Error(
            'El código de verificación ha expirado.'
        );
    }

    if (tipo === 'correo') {
        if (cambio.claveVerificacionDireccionCorreoElectronico !== codigo) {
            throw new Error(
                'El código no corresponde a la verificación del correo.'
            );
        }

        cambio.verificacionDireccionCorreoElectronico = true;
    } else {
        if (cambio.claveVerificacionTelefono !== codigo) {
            throw new Error(
                'El código no corresponde a la verificación del teléfono.'
            );
        }

        cambio.verificacionTelefono = true;
    }

    const verificacionPendiente: ('correo' | 'telefono')[] = [];

    if (!cambio.verificacionDireccionCorreoElectronico) {
        verificacionPendiente.push('correo');
    }

    if (!cambio.verificacionTelefono) {
        verificacionPendiente.push('telefono');
    }

    const estaFinalizado = verificacionPendiente.length === 0;

    if (estaFinalizado) {
        const claves = [
            cambio.claveVerificacionDireccionCorreoElectronico,
            cambio.claveVerificacionTelefono
        ].filter((clave): clave is string => Boolean(clave));

        if (claves.length > 0) {
            await redis.del(...claves.map(obtenerLlave));
        }
    } else {
        await guardarPreCambio(cambio, ttl);
    }

    return {
        estaFinalizado,
        verificacionPendiente,
        datos: estaFinalizado ? cambio : null
    };
}