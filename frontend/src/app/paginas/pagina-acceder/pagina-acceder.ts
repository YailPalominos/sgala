import { Component, inject, signal } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogoAyuda } from '../../dialogos/dialogo-ayuda/dialogo-ayuda';
import { environment } from '../../../environments/environment';
import { DialogoValidacion } from '../../dialogos/dilogo-validacion/dialogo-validacion';
import { DialogoRecuperacion } from '../../dialogos/dialogo-recuperacion/dialogo-recuperacion';
import { FormularioUsuario } from '../../formularios/formulario-usuario/formulario-usuario';
import { Autenticador } from '../../recursos/autenticador';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { Notificador } from '../../recursos/notificador';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { TemaServicio } from '../../recursos/tema.servicio';
import { DialogoAgente } from '../../dialogos/dialogo-agente/dialogo-agente';
import { FormularioPreUsuario } from '../../formularios/formulario-pre-usuario/formulario-pre-usuario';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './pagina-acceder.html',
  styleUrl: './pagina-acceder.scss',
})
export class PaginaAcceder {
  private autenticador = inject(Autenticador);
  private usuarioServicio = inject(ServicioUsuario);
  private administradorServicio = inject(ServicioAdministrador);
  private router = inject(Router);
  private rutaActiva = inject(ActivatedRoute);
  private notificador = inject(Notificador);
  private dialogoServicio = inject(DialogoServicio)
  public temaServicio = inject(TemaServicio)

  public formulario = new FormGroup({
    identificador: new FormControl('', [Validators.required]),
    contrasena: new FormControl('', [Validators.required]),
  });

  ocultarContrasena = signal(true);
  version = environment.version;
  esAdministrador = signal(false);

  ngOnInit(): void {
    this.autenticador.eliminarSesion()
    this.dialogoServicio.eliminarTodos()

    this.esAdministrador.set(
      this.rutaActiva.snapshot.queryParamMap.get('tipo') === 'administrador'
    );
  }

  enviar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { identificador, contrasena } = this.formulario.getRawValue();
    const credenciales = { identificador: identificador!, contrasena: contrasena! };
    const solicitud = this.esAdministrador()
      ? this.administradorServicio.autenticar(credenciales)
      : this.usuarioServicio.acceder(credenciales);
    solicitud.subscribe({
      next: (respuesta) => {
        if (respuesta.estatus === 202) {
          this.notificador.advertencia("Debe cambiar su contraseña")
          const llave = respuesta.datos;
          this.router.navigate(['/restablecer'], { queryParams: { llave } });
        } else {
          this.autenticador.guardarSesion(respuesta.datos);
          const sesion = this.autenticador.obtenerSesion();
          this.notificador.exitoso("Bienvenido " + sesion?.alias);
          this.router.navigate([this.esAdministrador() ? '/dispositivos' : '/inicio']);
        }
      }
    });
  }

  registrarUsuario(): void {
    this.dialogoServicio.abrir({
      referencia: FormularioPreUsuario,
      titulo: 'Usuario',
      icono: 'person',
      largo: 'l40%,m55%,c100%',
      desactivarAutocerrado: true,
      parametros: 'C',
      recordar: false,
    });
  }

  abrirRecuperacion(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoRecuperacion,
      titulo: 'Recuperar contraseña',
      icono: 'lock_reset',
      largo: 'l30%,m50%,c100%',
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
      largo: 'l35%,m55%,c100%',
      desactivarAutocerrado: true,
      recordar: false
    });
  }

  abrirAgente(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoAgente,
      titulo: 'Agente',
      icono: 'support_agent',
      largo: 'l30%,m50%,c100%',
      desactivarAutocerrado: true,
      recordar: false
    });
  }
}
