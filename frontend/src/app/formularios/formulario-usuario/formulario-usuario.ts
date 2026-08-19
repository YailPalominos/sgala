import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from "@angular/material/tooltip";
import { Router } from '@angular/router';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Autenticador } from '../../recursos/autenticador';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { Notificador } from '../../recursos/notificador';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { PushServicio } from '../../recursos/push';

@Component({
  selector: 'formulario-usuario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltip
  ],
  templateUrl: './formulario-usuario.html',
})
export class FormularioUsuario extends Formulario {

  private autenticador = inject(Autenticador);
  private servicioUsuario = inject(ServicioUsuario)
  private notificador = inject(Notificador);
  private router = inject(Router);
  private dialogoServicio = inject(DialogoServicio);
  public pushServicio = inject(PushServicio)

  public formulario = new FormGroup({
    clave: new FormControl('', Validators.required),
    alias: new FormControl('', [
      Validators.required,
      Validators.maxLength(15),
      Validators.pattern(/^[a-zA-Z0-9]+$/)
    ]),
    direccionCorreoElectronico: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
  });

  public suscripcionActiva!: boolean

  public preparar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      throw new Error('El formulario contiene datos inválidos.');
    }

    const datos = this.formulario.getRawValue();

    const esActualizar = this.parametros == 'A' ? true : false;

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: esActualizar ? 'Actualizar usuario' : 'Crear usuario',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el usuario? La sesión actual deberá cerrarse.'
          : '¿Está seguro de crear este usuario?',
        esActualizar: esActualizar
      },
      datos: datos,
      alFinalizar: this.finalizarConfirmacion,
      clase: this.constructor.name
    });
  }

  async ngOnInit() {
    this.suscripcionActiva = await this.pushServicio.verificarSuscripcion();
  }



  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      if (respuesta.parametros.esActualizar == true) {
        this.actualizar(respuesta.datos)
      } else {
        this.crear(respuesta.datos);
      }
    }
  }

  public actualizar(datos: any): void {
    this.servicioUsuario.actualizar(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Usuario actualizdo exitosamente.")
        this.cerrar(true)
      }
    });
  }

  public crear(datos: any): void {
    this.servicioUsuario.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Usuario creado exitosamente.")
        this.cerrar(true)
      }
    });
  }

  public restablecer() {
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Cambiar la contraseña',
        mensaje: '¿Estas seguro de cambiar la contraseña?',
      },
      alFinalizar: this.finalizarRestablecer,
      clase: this.constructor.name
    });
  }

  private finalizarRestablecer(respuesta: any) {
    if (respuesta.respuesta == true) {
      this.solicitarLlave();
    }
  }


  public solicitarLlave() {
    this.servicioUsuario.solicitarLlaveRecuperacion().subscribe({
      next: (respuesta) => {
        this.autenticador.eliminarSesion()
        this.router.navigate(['/restablecer'], {
          queryParams: {
            clave: respuesta.datos.claveLlaveRecuperacion
          }
        });
        this.cerrar(true)
      },
    });
  }

  async crearSuscripcion(): Promise<void> {
    await this.pushServicio.crearSuscripcion();
  }
  async eliminarSuscripcion(): Promise<void> {
    await this.pushServicio.eliminarSuscripcion();
  }
}
