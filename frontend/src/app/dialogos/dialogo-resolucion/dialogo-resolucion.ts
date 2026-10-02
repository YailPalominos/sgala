import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective } from 'ngx-mask';


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
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NgxMaskDirective,
    ReactiveFormsModule
  ],
  templateUrl: './dialogo-resolucion.html'
})
export class DialogoResolucion extends Dialogo {

  readonly entrada = new FormControl('', [Validators.required]);
  readonly entradaConfirmar = new FormControl('', [Validators.required]);

  private readonly suscripcion = merge(
    this.entrada.valueChanges,
    this.entradaConfirmar.valueChanges
  ).subscribe(() => {

    this.validarConfirmacion();

  });

  private validarConfirmacion(): void {

    if (
      this.entrada.value !==
      this.entradaConfirmar.value
    ) {

      this.entradaConfirmar.setErrors({
        noCoincide: true
      });

    } else {

      this.entradaConfirmar.setErrors(null);

    }

  }

  public responder(): void {
    this.cerrar(this.entrada.value)
  }

}