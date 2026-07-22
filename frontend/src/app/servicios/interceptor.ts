import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AutenticacionServicio } from './autenticacion.servicio';
import { MatDialog } from '@angular/material/dialog';

export const Interceptor: HttpInterceptorFn = (req, next) => {

    const router = inject(Router);
    const authService = inject(AutenticacionServicio);
    const dialog = inject(MatDialog);

    return next(req).pipe(

        map(event => {

            // ✅ Solo transformamos respuestas HTTP finales
            if (event instanceof HttpResponse) {

                const body =
                    event.body !== null && typeof event.body === 'object'
                        ? event.body as Record<string, any>
                        : {};

                return event.clone({
                    body: {
                        datos: body['datos'] ?? null,
                        mensaje: body['mensaje'] ?? 'Operación exitosa',
                        advertencia: body['advertencia'] ?? null,
                        estatus: event.status
                    }
                });
            }

            // ⚠️ IMPORTANTE: regresar el evento si no es HttpResponse
            return event;
        }),

        catchError((error: HttpErrorResponse) => {

            // 🔌 Sin conexión con el servidor
            if (error.status === 0) {
                return throwError(() =>
                    new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
                );
            }

            // 🔐 Sesión expirada / no autorizada
            if (error.status === 401) {
                dialog.closeAll();
                authService.eliminarSesion();
                router.navigate(['/inicio-sesion']);

                const mensaje =
                    error.error?.mensaje ||
                    error.error?.message ||
                    `${error.status}: ${error.statusText}`;
                return throwError(() =>
                    new Error(mensaje)
                );
            }

            // 🚨 Otros errores controlados
            const mensaje =
                error.error?.mensaje ||
                error.error?.message ||
                `${error.status}: ${error.statusText}`;

            return throwError(() => new Error(mensaje));
        })
    );
};
