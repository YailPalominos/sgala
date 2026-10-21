import { obtenerSesionPorClave, SesionRedis } from '@/repositorios/redis/sesiones.redis';


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
     * Busca en todas las sesiones de todos los usuarios.
     * Útil para el middleware donde aún no se conoce el usuario.
     *
     * @param claveSesion - Clave UUID de la sesión.
     * @returns Datos de la sesión.
     * @throws Error si la sesión no existe o expiró.
     */
    async obtenerSesion(claveSesion: string): Promise<SesionRedis> {

        const sesion = await obtenerSesionPorClave(claveSesion);

        if (!sesion) {
            throw new Error(
                'La sesión no existe o ha expirado.'
            );
        }

        return sesion;
    }
};
