import webpush from 'web-push';
import { entorno } from './recursos/entorno';
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
 */
export async function enviarWebPush(
    suscripcion: webpush.PushSubscription,
    titulo: string,
    mensaje: string,
    datos?: unknown
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
    } catch (error) {
        console.error(
            '❌ Error enviando Web Push:',
            error
        );
    }
}
