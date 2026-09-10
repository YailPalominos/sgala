import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Dialogo } from '../../recursos/dialogo.base';

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
export class DialogoSeleccion extends Dialogo {

  seleccion: string | null = null;

  override cargar(): void {
    if (this.parametros?.seleccionInicial) {
      this.seleccion = this.parametros.seleccionInicial;
    }
  }

  aceptar(): void {
    this.cerrar(this.seleccion);
  }

  cancelar(): void {
    this.cerrar(null);
  }
}
