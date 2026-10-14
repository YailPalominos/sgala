import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export interface Sesion {
  clave: string;
  claveUsuario: string
  tipoCuenta?: 'usuario' | 'administrador';
  alias: string;
  direccionCorreoElectronico: string;
  claveSocket: string;
  telefono: string;
  permisos?: string
}

@Injectable({ providedIn: 'root' })
export class Autenticador {

  private readonly claveSesion = 'sesion';
  private readonly permisosAdministradorPorDefecto =
    'DIP:OBL;EVA:OBL;GRA:OBL;ADM:OBL;SOL:OBL';
  private readonly permisosUsuarioPorDefecto = 'CLI:INI,TAB,OBL';

  private autenticadoSubject = new BehaviorSubject<boolean>(this.existeSesion());
  public autenticado$ = this.autenticadoSubject.asObservable();


  constructor(
    private router: Router
  ) { }

  public estaAutenticado(): boolean {
    return this.autenticadoSubject.value;
  }

  private existeSesion(): boolean {
    const datos = localStorage.getItem(this.claveSesion);
    return !!datos && datos !== 'undefined';
  }

  public guardarSesion(sesion: Sesion): void {
    this.aplicarPermisosPorDefecto(sesion);
    localStorage.setItem(this.claveSesion, JSON.stringify(sesion));
    this.autenticadoSubject.next(true);
  }

  public obtenerSesion(): Sesion | null {
    const datos = localStorage.getItem(this.claveSesion);

    if (!datos || datos === 'undefined') {
      return null;
    }

    const sesion = JSON.parse(datos) as Sesion;
    if (this.aplicarPermisosPorDefecto(sesion)) {
      localStorage.setItem(this.claveSesion, JSON.stringify(sesion));
    }
    return sesion;
  }

  private aplicarPermisosPorDefecto(sesion: Sesion): boolean {
    const permisosAnteriores = sesion.permisos;

    if (
      sesion.tipoCuenta === 'administrador' &&
      (!sesion.permisos || sesion.permisos === this.permisosUsuarioPorDefecto)
    ) {
      sesion.permisos = this.permisosAdministradorPorDefecto;
    } else if (!sesion.permisos) {
      sesion.permisos = this.permisosUsuarioPorDefecto;
    }

    return permisosAnteriores !== sesion.permisos;
  }

  public eliminarSesion(): void {
    localStorage.removeItem(this.claveSesion);
    this.autenticadoSubject.next(false);
    this.router.navigate([
      '/acceder'
    ]);
  }
  public eliminarSesionSinNavegar(): void {
    localStorage.removeItem(this.claveSesion);
    this.autenticadoSubject.next(false);
  }

  public obtenerPermisosPorClave(claveBusqueda: string): string[] {
    const permisosCadena = this.obtenerSesion()?.permisos;

    if (!permisosCadena) {
      return [];
    }

    for (const seccion of permisosCadena.split(';')) {
      const [clave, permisos] = seccion.split(':').map(valor => valor.trim());
      if (clave === claveBusqueda) {
        return permisos
          ? permisos.split(',').map(permiso => permiso.trim()).filter(Boolean)
          : [];
      }
    }

    return [];
  }


}
