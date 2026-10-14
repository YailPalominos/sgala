import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Autenticador } from './autenticador';
import { obtenerClavePorRuta, rutasAdministrador, rutasUsuario } from './constantes';

@Injectable({
    providedIn: 'root'
})
export class Autorizador implements CanActivate {

    constructor(
        private autenticador: Autenticador,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {


        if (!this.autenticador.estaAutenticado()) {
            return this.router.createUrlTree(['/acceder'], {
                queryParams: { returnUrl: state.url }
            });
        }

        const ruta = state.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');

        
        const clave = obtenerClavePorRuta(ruta) ?? 'NA';

        if (this.autenticador.obtenerPermisosPorClave(clave).length > 0) {
            return true;
        }

        const rutas = this.autenticador.obtenerSesion()?.tipoCuenta === 'administrador'
            ? rutasAdministrador
            : rutasUsuario;
        const rutaPermitida = rutas.find(opcion =>
            this.autenticador.obtenerPermisosPorClave(opcion.clave)
                .includes(opcion.permiso)
        )?.ruta;

        return this.router.createUrlTree([rutaPermitida ?? '/acceder']);

    }
}
