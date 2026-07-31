import { Component, inject, Input } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { Notificador } from '../../recursos/notificador';
import { Formulario } from '../../recursos/dialogo.base.formulario';

export interface ValidarClaveData {
  tipo: 'U' | 'D';
}
@Component({
  selector: 'dialogo-validacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dialogo-validacion.html',
})
export class DialogoValidacion extends Formulario {

  private servicioUsuario = inject(ServicioUsuario);
  private servicioDispositivo = inject(ServicioDispositivo);
  private notificador = inject(Notificador);

  public formulario = new FormGroup({
    clave: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    ]),
  });

  verificar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const clave = this.formulario.getRawValue().clave!;

    const peticion = this.parametros.tipo === 'U'
      ? this.servicioUsuario.validarClave(clave)
      : this.servicioDispositivo.validarClave(clave);

    peticion.subscribe({
      next: (respuesta) => {
        if (respuesta.estatus === 200) {
          this.notificador.exitoso(
            "Clave validada exitosamente."
          );
          this.cerrar(clave);
        }
        if (respuesta.estatus === 202) {
          this.cerrar(undefined);
          throw new Error(respuesta.mensaje)
        }
      }
    });
  }
}