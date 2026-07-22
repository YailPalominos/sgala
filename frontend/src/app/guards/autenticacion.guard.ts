import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AutenticacionServicio } from '../servicios/autenticacion.servicio';

export const autenticacionGuard: CanActivateFn = () => {

    const autenticacionServicio = inject(AutenticacionServicio);
    const router = inject(Router);

    return autenticacionServicio.autenticado$.pipe(

        take(1),

        map(autenticado => {

            if (autenticado) {
                return true;
            }

            return router.createUrlTree(['/inicio-sesion']);
        })

    );
};