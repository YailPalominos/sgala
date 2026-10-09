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
  permisos: string
}

@Injectable({ providedIn: 'root' })
export class Autenticador {

  private readonly claveSesion = 'sesion';

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
    sesion.permisos = "CLI:INI,TAB,OBL"
    localStorage.setItem(this.claveSesion, JSON.stringify(sesion));
    this.autenticadoSubject.next(true);
  }

  public obtenerSesion(): Sesion | null {
    const datos = localStorage.getItem(this.claveSesion);

    if (!datos || datos === 'undefined') {
      return null;
    }

    return JSON.parse(datos) as Sesion;
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
