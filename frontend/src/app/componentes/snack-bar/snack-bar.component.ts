import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-snack-bar',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="snack-bar-contenido" [class]="'snack-bar-' + data.tipo.toLowerCase()">
      <span class="snack-bar-mensaje">{{ data.mensaje }}</span>
      <button mat-button (click)="cerrar()">✕</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .snack-bar-contenido {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 18px 16px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      min-height: 56px;
    }

    .snack-bar-contenido button {
      color: white;
      min-width: auto;
      padding: 0 8px;
    }

    .snack-bar-mensaje {
      flex: 1;
      text-align: center;
      white-space: pre-line;
    }

    .snack-bar-error {
      background-color: #d32f2f;
    }

    .snack-bar-advertencia {
      background-color: #f57c00;
    }

    .snack-bar-exitoso {
      background-color: #388e3c;
    }

    .snack-bar-informacion {
      background-color: #8463e0;
    }
  `],
})
export class SnackBarComponent {
  data: { mensaje: string; tipo: string; tiempo?: number } = inject(MAT_SNACK_BAR_DATA);
  private snackBarRef = inject(MatSnackBarRef);

  cerrar(): void {
    this.snackBarRef.dismiss();
  }
}
