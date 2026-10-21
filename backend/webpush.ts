import webpush from 'web-push';
import { entorno } from './recursos/entorno';
import { eliminarSuscripcion } from './repositorios/redis/suscripciones.redis';
let configurado = false;

/**
 * Inicializa Web Push.
 */
export function iniciarWebPush(): void {
    if (configurado) {
        return;
    }
    console.log('🔔 Web Push iniciado.');
    webpush.setVapidDetails(
        'mailto:soporte@ejemplo.com',
        entorno.VAPID_PUBLIC_KEY!,
        entorno.VAPID_PRIVATE_KEY!
    );
    configurado = true;
}

/**
 * Envía una notificación push.
 * Si la suscripción fue revocada (410), la elimina automáticamente.
 */
export async function enviarWebPush(
    suscripcion: webpush.PushSubscription,
    titulo: string,
    mensaje: string,
    datos?: unknown,
    idUsuario?: number
): Promise<void> {
    try {
        await webpush.sendNotification(
            suscripcion,
            JSON.stringify({
                title: titulo,
                body: mensaje,
                data: datos
            })
        );
    } catch (error: any) {
        if (error?.statusCode === 410 && idUsuario) {
            await eliminarSuscripcion(idUsuario, suscripcion.endpoint);
            console.log(`🗑️ Suscripción revocada eliminada: ${suscripcion.endpoint.slice(0, 50)}...`);
        } else {
            console.error(
                '❌ Error enviando Web Push:',
                error?.statusCode || error
            );
        }
    }
}
