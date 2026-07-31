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
  templateUrl: './dialogo-seleccion.html',
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
export class DialogoSeleccion {

  private dialogRef = inject(MatDialogRef<DialogoSeleccion>);
  protected data = inject<SeleccionData>(MAT_DIALOG_DATA);

  seleccion: string | null = this.data.seleccionInicial ?? null;

  aceptar(): void {
    this.dialogRef.close(this.seleccion);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}