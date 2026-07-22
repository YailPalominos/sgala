import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface OpcionSeleccion {
  clave: string;
  texto: string;
}

export interface SeleccionData {
  titulo?: string;
  mensaje?: string;
  textoAceptar?: string;
  textoCancelar?: string;
  opciones: OpcionSeleccion[];
  seleccionInicial?: string;
  requerido?: boolean;
}

@Component({
  selector: 'app-seleccion-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.titulo || 'Seleccionar opción' }}
    </h2>

    <mat-dialog-content>

      @if (data.mensaje) {
        <p>{{ data.mensaje }}</p>
      }

      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>Selecciona una opción</mat-label>

        <mat-select [(ngModel)]="seleccion">

          @if (!data.requerido) {
            <mat-option [value]="null">
              Ninguno
            </mat-option>
          }

          @for (opcion of data.opciones; track opcion.clave) {
            <mat-option [value]="opcion.clave">
              {{ opcion.texto }}
            </mat-option>
          }

        </mat-select>
      </mat-form-field>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">
        {{ data.textoCancelar || 'Cancelar' }}
      </button>

      <button
        mat-raised-button
        color="primary"
        [disabled]="data.requerido && !seleccion"
        (click)="aceptar()">
        {{ data.textoAceptar || 'Aceptar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 350px;
      padding-top: 8px;
    }

    mat-form-field {
      margin-top: 12px;
    }
  `]
})
export class SeleccionDialogComponent {

  private dialogRef = inject(MatDialogRef<SeleccionDialogComponent>);
  protected data = inject<SeleccionData>(MAT_DIALOG_DATA);

  seleccion: string | null = this.data.seleccionInicial ?? null;

  aceptar(): void {
    this.dialogRef.close(this.seleccion);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}