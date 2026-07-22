import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmacionData {
  titulo?: string;
  mensaje?: string;
  textoSi?: string;
  textoNo?: string;
}

@Component({
  selector: 'app-confirmacion-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title class="centrado">
      {{ data.titulo || 'Confirmar' }}
    </h2>

    <mat-dialog-content class="centrado">
      {{ data.mensaje || '¿Está seguro de realizar esta acción?' }}
    </mat-dialog-content>

    <mat-dialog-actions align="center">
      <button mat-button (click)="responder(false)">
        {{ data.textoNo || 'No' }}
      </button>

      <button mat-raised-button color="primary" (click)="responder(true)">
        {{ data.textoSi || 'Sí' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .centrado {
      text-align: center;
      justify-content: center;
    }

    mat-dialog-content {
      padding: 16px 24px;
      font-size: 15px;
    }

    mat-dialog-actions {
      gap: 12px;
      padding-bottom: 16px;
    }
  `]
})
export class ConfirmacionDialogComponent {

  private dialogRef = inject(MatDialogRef<ConfirmacionDialogComponent>);
  protected data = inject<ConfirmacionData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  responder(valor: boolean) {
    this.dialogRef.close(valor);
  }
}