import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { RecuperacionDialog } from '../../dialogos/recuperacion/recuperacion.dialog';
import { AyudaDialog } from '../../dialogos/ayuda/ayuda.dialog';
import { environment } from '../../../environments/environment';
import { UsuarioServicio } from '../../servicios/usuario.servicio';
import { UsuarioDialog } from '../../dialogos/usuario/usuario.dialog';
import { DialogoValidarClave } from '../../dialogos/validar-clave/validar-clave.dialogo';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private authService = inject(AutenticacionServicio);
  private usuarioServicio = inject(UsuarioServicio);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notificador = inject(NotificadorServicio);
  private cargador = inject(CargadorServicio);

  formulario = new FormGroup({
    identificador: new FormControl('', [Validators.required]),
    contrasena: new FormControl('', [Validators.required]),
  });


  ocultarContrasena = signal(true);
  version = environment.version;


  ngOnInit(): void {
    this.authService.eliminarSesion()
  }

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargador.mostrar();

    const { identificador, contrasena } = this.formulario.getRawValue();

    this.usuarioServicio.acceder({ identificador: identificador!, contrasena: contrasena! }).subscribe({
      next: (respuesta) => {
        this.cargador.ocultar();
        if (respuesta.estatus === 202) {
          this.notificador.advertencia("Debe cambiar su contraseña")
          const llave = respuesta.datos;
          this.router.navigate(['/restablecer'], { queryParams: { llave } });
        } else {
          this.authService.guardarSesion(respuesta.datos);
          const sesion = this.authService.obtenerSesion();
          this.notificador.exitoso("Bienvenido " + sesion?.alias);
          this.router.navigate(['/inicio']);
        }
      },
      error: (error) => {
        this.cargador.ocultar();
        throw new Error(error);
      },
    });
  }

  abrirRegistro(): void {
    const dialogClave = this.dialog.open(DialogoValidarClave, {
      width: '420px',
      disableClose: true,
      data: {
        tipo: 'U'
      }
    });

    dialogClave.afterClosed().subscribe((resultado: string | object | undefined) => {

      if (resultado === undefined || resultado === '') {
        return;
      }

      // La clave está disponible
      if (typeof resultado === 'string') {

        const dialogRef = this.dialog.open(UsuarioDialog, {
          width: '450px',
          disableClose: true,
          data: {
            accion: 'R',
            datos: {
              clave: resultado
            }
          }
        });

        dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
          if (respuesta === true) {

            setTimeout(() => {
              this.notificador.informacion(
                'El usuario fue creado exitosamente. Se envió un correo electrónico con la información de la cuenta, incluyendo el alias, teléfono y la contraseña provisional para iniciar sesión.'
              );
            }, 3000);

          }
        });

        return;
      }

      // La clave ya está siendo utilizada
      const usuario = resultado as {
        alias: string;
        telefono: string;
        direccionCorreoElectronico: string;
      };

      this.notificador.advertencia(
        `La clave ya está siendo usada por un usuario.\n\n` +
        `Alias: ${usuario.alias}\n` +
        `Teléfono: ${usuario.telefono}\n` +
        `Correo: ${usuario.direccionCorreoElectronico}`
      );
    });
  }

  abrirRecuperacion(): void {
    this.dialog.open(RecuperacionDialog, { width: '420px' });
  }

  abrirInformacion(): void {
    this.router.navigate(['/informacion']);
  }

  abrirAyuda(): void {
    this.dialog.open(AyudaDialog, { width: '480px' });
  }
}
