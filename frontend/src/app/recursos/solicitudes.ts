import {
    HttpInterceptorFn,
    HttpResponse,
    HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { Autenticador } from './autenticador';
import { Cargador } from './cargador';

export const Solicitudes: HttpInterceptorFn = (req, next) => {

    const router = inject(Router);
    const autenticador = inject(Autenticador);
    const dialog = inject(MatDialog);
    const cargador = inject(Cargador);

    cargador.mostrar();

    return next(req).pipe(

        map(event => {

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

            return event;
        }),

        catchError((error: HttpErrorResponse) => {

            if (error.status === 0) {
                return throwError(() =>
                    new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
                );
            }

            if (error.status === 401) {
                dialog.closeAll();
                autenticador.eliminarSesion();
                router.navigate(['/acceder']);
            }

            const mensaje =
                error.error?.mensaje ||
                error.error?.message ||
                `${error.status}: ${error.statusText}`;

            return throwError(() => new Error(mensaje));
        }),

        finalize(() => {
            cargador.ocultar();
        })

    );
};