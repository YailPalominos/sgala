import { SesionRedis } from '@/repositorios/redis/sesiones.redis';
import { AsyncLocalStorage } from 'node:async_hooks';

interface ContextoSolicitud {
    sesion: SesionRedis;
}

export const contextoSolicitud = new AsyncLocalStorage<ContextoSolicitud>();

export function ejecutarConContexto(sesion: SesionRedis, siguiente: () => void): void {
    contextoSolicitud.run(
        {
            sesion
        },
        siguiente
    );
}

export function obtenerSesion(): SesionRedis | undefined {
    return contextoSolicitud.getStore()?.sesion;
}