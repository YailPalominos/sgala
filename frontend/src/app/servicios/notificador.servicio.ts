import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarComponent } from '../componentes/snack-bar/snack-bar.component';

@Injectable({ providedIn: 'root' })
export class NotificadorServicio {
  private snackBar = inject(MatSnackBar);

  advertencia(mensaje: string): void {
    this.abrirSnackBar(mensaje, 'Advertencia');
  }

  exitoso(mensaje: string): void {
    this.abrirSnackBar(mensaje, 'Exitoso', 3);
  }

  error(mensaje: string, tiempo?: number): void {
    this.abrirSnackBar(mensaje, 'Error', tiempo);
  }

  informacion(mensaje: string): void {
    this.abrirSnackBar(mensaje, 'Informacion');
  }

  private abrirSnackBar(mensaje: string, tipo: string, tiempo?: number): void {
    this.snackBar.dismiss();
    this.snackBar.openFromComponent(SnackBarComponent, {
      data: { mensaje, tipo, tiempo },
      duration: tiempo === undefined ? undefined : tiempo * 1000,
      verticalPosition: 'top',
      horizontalPosition: 'center',
    });
  }
}
