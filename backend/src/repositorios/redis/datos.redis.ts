import { redis } from '../../recursos/redis';

/**
 * Actualiza los precios de las suscripciones.
 * Si ya existen, los reemplaza completamente.
 */
export async function actualizarPrecios(
    precios: any[]
): Promise<void> {

    await redis.set(
        'precios',
        JSON.stringify(precios)
    );
}

/**
 * Obtiene los precios de las suscripciones.
 */
export async function obtenerPrecios(): Promise<any[]> {

    const datos = await redis.get('precios');

    if (!datos) {
        throw new Error(
            'No se encontraron los precios del sistema.'
        );
    }

    return JSON.parse(datos) as any[];
}

