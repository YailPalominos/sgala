import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
import { Cargador } from '../../recursos/cargador';
import { Socket } from '../../recursos/socket';
import { Formulario } from '../../recursos/dialogo.base.formulario';

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

  private cargador = inject(Cargador)
  private dialog = inject(MatDialog);
  private router = inject(Router);

  private socket = inject(Socket)

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

    const datos = this.formulario.getRawValue();

    const esActualizar = this.parametros.accion == 'A';

    const dialogoReferencia = this.dialog.open(DialogoConfirmacion, {
      width: '420px',
      data: {
        titulo: esActualizar ? 'Actualizar usuario' : 'Crear usuario',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el usuario? La sesión actual deberá cerrarse.'
          : '¿Está seguro de crear este usuario?',
        textoSi: 'Sí',
        textoNo: 'No'
      }
    });

    dialogoReferencia.afterClosed().subscribe((respuesta?: boolean) => {
      if (respuesta != undefined) {
        if (respuesta == true) {
          if (esActualizar) {
            this.actualizar(datos);
          } else {
            this.crear(datos);
          }
        }
      }
    });
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
    const datosCrear = {
      ...datos,
      clave: this.parametros.datos.clave
    };
    this.servicioUsuario.crear(datosCrear).subscribe({
      next: () => {
        this.notificador.exitoso("Usuario creado exitosamente.")
        this.cerrar(true)
      }
    });
  }

  public restablecer() {

    const dialogoReferencia = this.dialog.open(DialogoConfirmacion, {
      width: '420px',
      data: {
        titulo: 'Cambiar la contraseña',
        mensaje: '¿Estas seguro de cambiar la contraseña?',
        textoSi: 'Si',
        textoNo: 'No'
      }
    });

    dialogoReferencia.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta == true) {
        this.solicitarLlave();
      }
    });
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
}
