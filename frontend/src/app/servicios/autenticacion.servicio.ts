import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Sesion {
  clave: string;
  alias: string;
  direccionCorreoElectronico: string;
  idSocket: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {

  private readonly claveSesion = 'sesion';

  private autenticadoSubject = new BehaviorSubject<boolean>(this.existeSesion());

  public autenticado$ = this.autenticadoSubject.asObservable();

  private existeSesion(): boolean {
    const datos = localStorage.getItem(this.claveSesion);
    return !!datos && datos !== 'undefined';
  }

  public guardarSesion(sesion: Sesion): void {
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
  }

}
