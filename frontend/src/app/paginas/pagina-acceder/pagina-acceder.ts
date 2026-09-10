import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
      largo: '450px',
      desactivarAutocerrado: true,
      datos: {
        tipo: 'U'
      },
      alFinalizar: this.finalizarRegistrarUsuario.bind(this)
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
      largo: '450px',
      desactivarAutocerrado: true,
      parametros: 'C',
      datos: { clave: respuesta }
    });
  }

  abrirRecuperacion(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoRecuperacion,
      titulo: 'Recuperar contraseña',
      icono: 'lock_reset',
      largo: '420px',
      desactivarAutocerrado: true,
      recordar: false
    });
  }

  abrirInformacion(): void {
    this.router.navigate(['/informacion']);
  }

  abrirAyuda(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoAyuda,
      titulo: 'Ayuda o contacto',
      icono: 'help',
      largo: '480px',
      desactivarAutocerrado: true,
      recordar: false
    });
  }
}
