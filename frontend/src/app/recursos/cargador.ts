import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Cargador {
  private _visible = signal(false);
  private _mensaje = signal<string | null>(null);

  readonly visible = this._visible.asReadonly();
  readonly mensaje = this._mensaje.asReadonly();

  mostrar(mensaje: string | null = null): void {
    this._mensaje.set(mensaje);
    this._visible.set(true);
  }

  ocultar(): void {
    this._visible.set(false);
    this._mensaje.set(null);
  }
}
