import { redis } from '../recursos/redis';
import { SesionRedis } from '@/repositorios/redis/sesiones.redis';


/**
 * Servicio de sesión.
 *
 * Expone operaciones de sesión que el middleware
 * puede usar sin conocer el idUsuario de antemano.
 */
export const sesionServicio = {

    /**
     * Obtiene una sesión directamente por su clave.
     *
     * A diferencia del repositorio (que requiere idUsuario
     * para verificar pertenencia), este método busca el HASH
     * directamente, útil para el middleware donde aún no
     * se conoce el usuario.
     *
     * @param claveSesion - Clave UUID de la sesión.
     * @returns Datos de la sesión.
     * @throws Error si la sesión no existe o expiró.
     */
    async obtenerSesion(claveSesion: string): Promise<SesionRedis> {

        const datos = await redis.hgetall(
            `sesiones:${claveSesion}`
        );

        if (!datos || Object.keys(datos).length === 0) {
            throw new Error(
                'La sesión no existe o ha expirado.'
            );
        }

        if (!datos.idUsuario) {
            throw new Error(
                'La sesión no contiene idUsuario.'
            );
        }

        if (!datos.alias) {
            throw new Error(
                'La sesión no contiene alias.'
            );
        }

        return {
            clave: datos.clave,
            claveUsuario: datos.claveUsuario,
            idUsuario: Number(datos.idUsuario),
            alias: datos.alias,
            direccionCorreoElectronico: datos.direccionCorreoElectronico,
            telefono: datos.telefono,
            claveSocket: datos.claveSocket !== 'null'
                ? datos.claveSocket
                : undefined
        };
    }
};
