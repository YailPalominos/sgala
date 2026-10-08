import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { Notificador } from '../../recursos/notificador';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'formulario-pre-usuario',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    NgxMaskDirective
  ],
  templateUrl: './formulario-pre-usuario.html'
})
export class FormularioPreUsuario extends Formulario {


  private servicioUsuario = inject(ServicioUsuario)
  private notificador = inject(Notificador);
  private dialogoServicio = inject(DialogoServicio);

  public formulario = new FormGroup({
    alias: new FormControl('', [
      Validators.required,
      Validators.maxLength(15),
      Validators.pattern(/^[a-zA-Z0-9]+$/)
    ]),
    direccionCorreoElectronico: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
  });

  public preparar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      throw new Error('El formulario contiene datos inválidos.');
    }

    if (!this.hayCambios()) {
      throw new Error('No se realizaron cambios.');
    }

    const datos = this.formulario.getRawValue();

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Crear usuario',
        mensaje: '¿Está seguro de crear este usuario?',
      },
      datos: datos,
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      this.crear(respuesta.datos);
    }
  }

  public crear(datos: any): void {
    this.servicioUsuario.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso(
          'Revise su correo electrónico y siga el enlace de confirmación para completar su registro.'
        );
        this.cerrar(true)
      }
    });
  }

}