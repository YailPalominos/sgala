import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DialogoSeleccion } from '../dialogo-seleccion/dialogo-seleccion';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { Notificador } from '../../recursos/notificador';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';

@Component({
  selector: 'app-recuperacion-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dialogo-recuperacion.html',
})
export class DialogoRecuperacion extends Formulario {
  private servicioUsuario = inject(ServicioUsuario);
  private notificador = inject(Notificador);
  private dialogoServicio = inject(DialogoServicio);


  formulario = new FormGroup({
    identificador: new FormControl('', [Validators.required]),
  });

  verificar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const identificador = this.formulario.getRawValue().identificador!;
    this.servicioUsuario.verificarIdentidad(identificador).subscribe({
      next: (respuesta) => {
        this.notificador.exitoso("Identidad verificada exitosamente.")
        this.dialogoServicio.abrir({
          referencia: DialogoSeleccion,
          titulo: 'Seleccionar medio',
          icono: 'contact_mail',
          largo: '400px',
          desactivarAutocerrado: true,
          recordar: false,
          parametros: {
            titulo: 'Selecciona',
            mensaje: 'Como quieres que te llegue el enlace de recuperación para restablecer tu contraseña.',
            requerido: true,
            opciones: [
              { clave: 'C', texto: 'Correo electronico (' + respuesta.datos.direccionCorreoElectronico + ')' },
            ]
          },
          alFinalizar: this.finalizarSeleccion.bind(this)
        });
      },
      error: (error: any) => {
        throw new Error(error)
      },
    });
  }

  private finalizarSeleccion(respuesta: any): void {
    if (respuesta?.resultado) {
      const identificador = this.formulario.getRawValue().identificador!;
      this.enviar(identificador, respuesta.resultado);
    }
  }


  enviar(identificador: string, tipo: string) {

    this.servicioUsuario.solicitarRecuperacion(identificador, tipo).subscribe({
      next: () => {
        this.notificador.exitoso("Se ha enviado en enlace para restablecer tu contraseña.")
        this.cerrar();
      },
      error: (error: any) => {
        throw new Error(error)
      },
    });
  }

}
