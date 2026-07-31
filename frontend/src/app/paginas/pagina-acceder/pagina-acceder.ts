import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DialogoAyuda } from '../../dialogos/dialogo-ayuda/dialogo-ayuda';
import { environment } from '../../../environments/environment';
import { DialogoValidacion } from '../../dialogos/dilogo-validacion/dialogo-validacion';
import { DialogoRecuperacion } from '../../dialogos/dialogo-recuperacion/dialogo-recuperacion';
import { FormularioUsuario } from '../../formularios/formulario-usuario/formulario-usuario';
import { Autenticador } from '../../recursos/autenticador';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { Notificador } from '../../recursos/notificador';
import { DialogoServicio } from '../../recursos/dialogo.servicio';

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
  templateUrl: './pagina-acceder.html',
  styleUrl: './pagina-acceder.scss',
})
export class PaginaAcceder {
  private autenticador = inject(Autenticador);
  private usuarioServicio = inject(ServicioUsuario);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notificador = inject(Notificador);
  private dialogoServicio = inject(DialogoServicio)

  public formulario = new FormGroup({
    identificador: new FormControl('', [Validators.required]),
    contrasena: new FormControl('', [Validators.required]),
  });

  ocultarContrasena = signal(true);
  version = environment.version;

  ngOnInit(): void {
    this.autenticador.eliminarSesion()
  }

  enviar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { identificador, contrasena } = this.formulario.getRawValue();
    this.usuarioServicio.acceder({ identificador: identificador!, contrasena: contrasena! }).subscribe({
      next: (respuesta) => {
        if (respuesta.estatus === 202) {
          this.notificador.advertencia("Debe cambiar su contraseña")
          const llave = respuesta.datos;
          this.router.navigate(['/restablecer'], { queryParams: { llave } });
        } else {
          this.autenticador.guardarSesion(respuesta.datos);
          const sesion = this.autenticador.obtenerSesion();
          this.notificador.exitoso("Bienvenido " + sesion?.alias);
          this.router.navigate(['/inicio']);
        }
      }
    });
  }

  registrarUsuario(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoValidacion,
      titulo: 'Validar',
      icono: 'check_circle',
      width: '450px',
      disableClose: true,
      data: {
        tipo: 'U'
      },
      alFinalizar: this.finalizarRegistrarUsuario,
      clase: this.constructor.name
    });
  }

  finalizarRegistrarUsuario(respuesta?: string) {
    if (respuesta === undefined || respuesta === '') {
      return;
    }
    this.dialogoServicio.abrir({
      referencia: FormularioUsuario,
      titulo: 'Usuario',
      icono: 'person',
      width: '450px',
      disableClose: true,
      data: {
        accion: 'R',
        datos: { clave: respuesta }
      }
    });
  }

  abrirRecuperacion(): void {
    this.dialog.open(DialogoRecuperacion, { width: '420px' });
  }

  abrirInformacion(): void {
    this.router.navigate(['/informacion']);
  }

  abrirAyuda(): void {
    this.dialog.open(DialogoAyuda, { width: '480px' });
  }
}
