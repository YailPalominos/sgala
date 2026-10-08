import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxMaskDirective } from 'ngx-mask';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoCaptura } from '../../dialogos/dialogo-captura/dialogo-captura';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { Notificador } from '../../recursos/notificador';
import { Autenticador } from '../../recursos/autenticador';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { TemaServicio } from '../../recursos/tema.servicio';
import { temas, Tema } from '../../recursos/constantes';

@Component({
  selector: 'formulario-administrador-perfil',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    NgxMaskDirective,
    ReactiveFormsModule
  ],
  templateUrl: './formulario-administrador-perfil.html'
})
export class FormularioAdministradorPerfil extends Formulario {
  private readonly servicio = inject(ServicioAdministrador);
  private readonly dialogoServicio = inject(DialogoServicio);
  private readonly notificador = inject(Notificador);
  private readonly autenticador = inject(Autenticador);
  public readonly temaServicio = inject(TemaServicio);

  public temas: Tema[] = temas;

  readonly formulario = new FormGroup({
    nombres: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    apellidos: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    direccionCorreoElectronico: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(100)
    ]),
    telefono: new FormControl('', [Validators.pattern(/^[0-9]{10}$/)]),
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
          telefono: datos.telefono ?? '',
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
      telefono: string;
      alias: string;
      contrasena: string;
    };
    this.servicio.actualizarPerfil({
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      direccionCorreoElectronico: datos.direccionCorreoElectronico.trim(),
      telefono: datos.telefono?.trim() ? datos.telefono.trim() : null,
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

  /** Cambia el tema visual (igual que el usuario, se guarda en localStorage). */
  public cambiarTema(clave: string): void {
    this.temaServicio.aplicar(clave);
  }

  /**
   * Restablece la contraseña: pide la nueva contraseña en un diálogo
   * de captura y la guarda cifrada en el servidor.
   */
  public restablecer(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoCaptura,
      titulo: 'Cambiar contraseña',
      icono: 'lock_reset',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Nueva contraseña',
        mensaje: 'Ingresa tu nueva contraseña.',
        entrada: {
          etiqueta: 'Nueva contraseña',
          tipo: 'password',
          validaciones: [Validators.required, Validators.minLength(4), Validators.maxLength(255)]
        }
      },
      alFinalizar: this.finalizarRestablecer.bind(this)
    });
  }

  private finalizarRestablecer(nuevaContrasena: any): void {
    if (typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 4) {
      return;
    }
    this.servicio.restablecerContrasena(nuevaContrasena).subscribe({
      next: () => {
        this.notificador.exitoso('Contraseña actualizada exitosamente.');
      },
      error: (respuestaError) => {
        const mensaje = respuestaError.error?.mensaje ?? 'No fue posible cambiar la contraseña.';
        this.notificador.error(mensaje);
      }
    });
  }
}
