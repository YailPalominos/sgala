import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Cargador {
  private _visible = signal(false);

  readonly visible = this._visible.asReadonly();

  mostrar(): void {
    this._visible.set(true);
  }

  ocultar(): void {
    this._visible.set(false);
  }
}
