import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { Autenticador } from './autenticador';

export const Autorizador: CanActivateFn = () => {
    const autenticador = inject(Autenticador);
    const router = inject(Router);
    return autenticador.autenticado$.pipe(
        take(1),
        map(autenticado => {
            if (autenticado) {
                return true;
            }
            return router.createUrlTree(['/acceder']);
        })
    );
};