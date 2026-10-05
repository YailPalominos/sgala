import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { Notificador } from '../../recursos/notificador';
import { Autenticador } from '../../recursos/autenticador';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

@Component({
  selector: 'formulario-administrador-perfil',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './formulario-administrador-perfil.html'
})
export class FormularioAdministradorPerfil extends Formulario {
  private readonly servicio = inject(ServicioAdministrador);
  private readonly dialogoServicio = inject(DialogoServicio);
  private readonly notificador = inject(Notificador);
  private readonly autenticador = inject(Autenticador);

  readonly formulario = new FormGroup({
    nombres: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    apellidos: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    direccionCorreoElectronico: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(100)
    ]),
    alias: new FormControl('', [Validators.required, Validators.maxLength(15)]),
    contrasena: new FormControl('', [Validators.maxLength(255)])
  });
  readonly cargando = signal(true);
  error: string | null = null;

  ngOnInit(): void {
    this.servicio.obtenerPerfil().subscribe({
      next: ({ datos }) => {
        this.formulario.patchValue({
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          direccionCorreoElectronico: datos.direccionCorreoElectronico,
          alias: datos.alias,
          contrasena: ''
        });
        this.cargando.set(false);
        queueMicrotask(() => this.hayCambios.set(false));
      },
      error: () => {
        this.error = 'No fue posible cargar el perfil del administrador.';
        this.cargando.set(false);
        this.notificador.error(this.error);
      }
    });
  }

  preparar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (!this.hayCambios()) return;

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar cambios',
      icono: 'check',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Actualizar perfil',
        mensaje: '¿Deseas guardar los cambios de tu perfil de administrador?'
      },
      datos: this.formulario.getRawValue(),
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  private finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado !== true) return;
    const datos = respuesta.datos as {
      nombres: string;
      apellidos: string;
      direccionCorreoElectronico: string;
      alias: string;
      contrasena: string;
    };
    this.servicio.actualizarPerfil({
      ...datos,
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      direccionCorreoElectronico: datos.direccionCorreoElectronico.trim(),
      alias: datos.alias.trim(),
      contrasena: datos.contrasena || undefined
    }).subscribe({
      next: ({ datos: actualizados }) => {
        const sesion = this.autenticador.obtenerSesion();
        if (sesion) {
          this.autenticador.guardarSesion({
            ...sesion,
            alias: actualizados.alias,
            direccionCorreoElectronico: actualizados.direccionCorreoElectronico
          });
        }
        this.notificador.exitoso('Perfil de administrador actualizado.');
        this.cerrar(true);
      },
      error: (respuestaError) => {
        const mensaje = respuestaError.error?.mensaje ?? 'No fue posible actualizar el perfil.';
        this.error = mensaje;
        this.notificador.error(mensaje);
      }
    });
  }
}
