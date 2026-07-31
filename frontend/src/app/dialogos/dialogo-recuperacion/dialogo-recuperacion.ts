import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DialogoSeleccion } from '../dialogo-seleccion/dialogo-seleccion';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { Notificador } from '../../recursos/notificador';

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
export class DialogoRecuperacion {
  private servicioUsuario = inject(ServicioUsuario);
  private notificador = inject(Notificador);
  private matDialog = inject(MatDialog)
  private dialogoReferencia = inject(MatDialogRef<DialogoRecuperacion>);

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
        this.matDialog.open(DialogoSeleccion, {
          data: {
            titulo: 'Selecciona',
            mensaje: 'Como quieres que te llegue el enlace de recuperación para restablecer tu contraseña.',
            requerido: true,
            opciones: [
              { clave: 'C', texto: 'Correo electronico (' + respuesta.datos.direccionCorreoElectronico + ')' },
              // { clave: 'C', texto: 'Teléfono (' + respuesta.datos.telefono + ')' },
            ]
          }
        }).afterClosed().subscribe((clave: any) => {
          if (clave) {
            this.enviar(identificador, clave)
          }
        });
      },
      error: (error: any) => {
        throw new Error(error)
      },
    });
  }


  enviar(identificador: string, tipo: string) {

    this.servicioUsuario.solicitarRecuperacion(identificador, tipo).subscribe({
      next: () => {
        this.notificador.exitoso("Se ha enviado en enlace para restablecer tu contraseña.")
        this.dialogoReferencia.close();
      },
      error: (error: any) => {
        throw new Error(error)
      },
    });
  }

}
