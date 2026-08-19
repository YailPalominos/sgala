/**
 * Service Worker para Web Push
 */

self.addEventListener('install', event => {
    console.log('🔔 Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('🔔 Service Worker activado');
    event.waitUntil(
        self.clients.claim()
    );

});

self.addEventListener('push', event => {
    event.waitUntil(
        (async () => {
            try {
                const datos =
                    event.data
                        ? event.data.json()
                        : {
                            title: 'Sgala',
                            body: 'Sin datos'
                        };
        
                await self.registration.showNotification(
                    datos.title,
                    {
                        body: datos.body,
                        icon: '/favicon.svg',
                        badge: '/favicon.svg',
                        data: datos.data,
                        requireInteraction: true,
                        silent: false,
                        renotify: true,
                        tag: 'Sgala-' + Date.now()
                    }
                );

            } catch (error) {
                console.error(
                    '❌ Error showNotification:',
                    error
                );
            }
        })()
    );
});

self.addEventListener('notificationclick', event => {

    event.notification.close();

    const datos = event.notification.data;

    event.waitUntil(

        (async () => {

            const ventanas =
                await clients.matchAll({
                    type: 'window',
                    includeUncontrolled: true
                });

            for (const ventana of ventanas) {

                if ('focus' in ventana) {

                    ventana.focus();

                    ventana.postMessage({
                        tipo: 'notificacion',
                        datos
                    });

                    return;

                }

            }

            await clients.openWindow('/');

        })()

    );

});

self.addEventListener('notificationclose', event => {
    console.log(
        '🔕 Notificación cerrada',
        event.notification.data
    );
});