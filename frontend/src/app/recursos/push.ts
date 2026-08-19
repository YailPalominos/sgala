import { inject, Injectable } from '@angular/core';
import { ServicioUsuario } from '../servicios/servicio-usuario';
import { Notificador } from './notificador';
import { Cargador } from './cargador';

@Injectable({
    providedIn: 'root'
})
export class PushServicio {

    public servicioUsuario = inject(ServicioUsuario);
    public notificador = inject(Notificador);
    public cargador = inject(Cargador)

    private clavePublicaVapid =
        'BKPCHP6gOGnVQxRK-nlfjAEICubR3-mN7zX6eRiYJcUbgB2FYHYJ6wOrvXBBHqevvfY5JVqg8T67SGrWjv3J5mM';

    /**
     * Crea la suscripción Web Push
     */
    async crearSuscripcion(): Promise<void> {

        this.cargador.mostrar();

        try {

            if (!('serviceWorker' in navigator)) {

                this.notificador.advertencia(
                    "El navegador no soporta el servicio de notificaciones en segundo plano."
                );

                return;
            }

            const permiso =
                await Notification.requestPermission();

            if (permiso !== 'granted') {

                this.notificador.advertencia(
                    "Rechazó el servicio de notificaciones."
                );

                return;
            }

            let registro =
                await navigator.serviceWorker.getRegistration('/');

            if (!registro) {

                registro =
                    await navigator.serviceWorker.register('/sw.js');

            }

            // Esperar a que el Service Worker quede activo
            await navigator.serviceWorker.ready;

            registro =
                await navigator.serviceWorker.getRegistration('/');

            if (!registro || !registro.active) {
                throw new Error('Service Worker no está activo.');
            }

            let suscripcion =
                await registro.pushManager.getSubscription();

            if (!suscripcion) {

                suscripcion =
                    await registro.pushManager.subscribe({

                        userVisibleOnly: true,

                        applicationServerKey:
                            this.convertirClave(
                                this.clavePublicaVapid
                            )

                    });

            }

            await this.guardarSuscripcion(
                suscripcion
            );

        } catch (error) {

            console.error(error);

            this.notificador.error(
                "No fue posible activar las notificaciones."
            );

        } finally {

            this.cargador.ocultar();

        }

    }


    /**
     * Verifica si existe una suscripción activa
     */
    async verificarSuscripcion(): Promise<boolean> {

        if (!('serviceWorker' in navigator)) {
            this.notificador.advertencia(
                "El navegador no soporta el servicio de notificaciones en segundo plano."
            );
            return false;
        }


        const registro =
            await navigator.serviceWorker.ready;


        const suscripcion =
            await registro.pushManager.getSubscription();


        return suscripcion !== null;
    }


    /**
     * Elimina la suscripción Web Push del navegador
     */
    async eliminarSuscripcion(): Promise<void> {

        this.cargador.mostrar();

        try {

            if (!('serviceWorker' in navigator)) {

                this.notificador.advertencia(
                    "El navegador no soporta el servicio de notificaciones en segundo plano."
                );

                return;
            }

            const registro =
                await navigator.serviceWorker.ready;

            const suscripcion =
                await registro.pushManager.getSubscription();

            if (!suscripcion) {

                this.notificador.informacion(
                    "No existe una suscripción activa."
                );

                return;
            }

            const eliminado =
                await suscripcion.unsubscribe();

            if (eliminado) {

                this.notificador.informacion(
                    "Suscripción a notificaciones eliminada."
                );

            } else {

                this.notificador.advertencia(
                    "No fue posible eliminar la suscripción."
                );

            }

        } catch (error) {

            console.error(error);

            this.notificador.error(
                "Ocurrió un error al eliminar la suscripción."
            );

        } finally {

            this.cargador.ocultar();

        }

    }



    private guardarSuscripcion(
        suscripcion: PushSubscription
    ): Promise<void> {

        return new Promise((resolve, reject) => {

            this.servicioUsuario
                .suscribirANotificaciones(suscripcion)
                .subscribe({

                    next: () => {

                        this.notificador.informacion(
                            "Suscripción a notificaciones completada."
                        );

                        resolve();

                    },

                    error: error => {
                        reject(error);
                    }

                });

        });

    }



    private convertirClave(
        clave: string
    ): ArrayBuffer {

        const padding =
            '='.repeat(
                (4 - clave.length % 4) % 4
            );


        const base64 =
            (clave + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');


        const rawData =
            window.atob(base64);


        const bytes =
            new Uint8Array(rawData.length);


        for (let i = 0; i < rawData.length; i++) {

            bytes[i] =
                rawData.charCodeAt(i);

        }


        return bytes.buffer;
    }
}