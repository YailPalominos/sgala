import { inject, Injectable, signal } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

/** Nombre único del spinner global gestionado por este servicio. */
export const NOMBRE_SPINNER = 'cargador-global';

@Injectable({ providedIn: 'root' })
export class Cargador {
  private spinner = inject(NgxSpinnerService);

  private _visible = signal(false);
  private _mensaje = signal<string | null>(null);

  readonly visible = this._visible.asReadonly();
  readonly mensaje = this._mensaje.asReadonly();

  mostrar(mensaje: string | null = null): void {
    this._mensaje.set(mensaje);
    this._visible.set(true);
    this.spinner.show(NOMBRE_SPINNER);
  }

  ocultar(): void {
    this._visible.set(false);
    this._mensaje.set(null);
    this.spinner.hide(NOMBRE_SPINNER);
  }
}
