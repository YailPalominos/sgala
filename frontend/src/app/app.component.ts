import { Component, inject, Type } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CargadorComponent } from './componentes/cargador/cargador.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { Dialogo, DialogoServicio } from './recursos/dialogo.servicio';
import { FormularioUsuario } from './formularios/formulario-usuario/formulario-usuario';
import { Socket } from './recursos/socket';
import { ServicioUsuario } from './servicios/servicio-usuario';
import { Cargador } from './recursos/cargador';
import { Autenticador, Sesion } from './recursos/autenticador';
import { Notificador } from './recursos/notificador';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CargadorComponent, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule, MatButtonModule, MatMenuModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {

  private socket = inject(Socket);
  private autenticacionServicio = inject(Autenticador);
  private router = inject(Router);

  public autenticado = false;
  public dialogoServicio = inject(DialogoServicio)
  public sesion!: Sesion

  public cargador = inject(Cargador)
  public notificador = inject(Notificador)

  public servicioUsuario = inject(ServicioUsuario)
  public autenticador = inject(Autenticador)

  //#region  Usuario

  ngOnInit() {
    this.autenticacionServicio.autenticado$
      .subscribe(valor => {
        this.autenticado = valor;
        if (valor) {
          this.socket.conectar();
          const sesion = this.autenticacionServicio.obtenerSesion()
          if (sesion != null) {
            this.sesion = sesion
          }
        } else {
          this.socket.desconectar();
        }
      });
  }

  public actualizarUsuario(): void {
    this.dialogoServicio.abrir({
      referencia: FormularioUsuario,
      titulo: 'Usuario',
      icono: 'person',
      width: '450px',
      disableClose: true,
      data: {
        accion: 'A',
        datos: this.sesion
      },
      alFinalizar: this.finalizarActualizarUsuario,
      clase: this.constructor.name
    });
  }

  private finalizarActualizarUsuario() {
    this.cargador.mostrar()
    setTimeout(() => {
      this.notificador.advertencia("Debes iniciar sesión nuevamente.")
    }, 2000);
    setTimeout(() => {
      this.cargador.ocultar()
      this.servicioUsuario.cerrarSesion().subscribe({
        next: () => {
          this.autenticador.eliminarSesion()
          this.socket.desconectar();
        }
      });
    }, 5000);
  }

  public cerrarSesion(): void {
    this.servicioUsuario.cerrarSesion().subscribe({
      next: () => {
        this.autenticacionServicio.eliminarSesion();
        this.socket.desconectar();
        this.router.navigate(['/iniciar-sesion']);
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }

  //#endregion

  public restaurar(idDialogo: string): void {
    this.dialogoServicio.restaurar(idDialogo)
  }

  //#region Ventanas

  public editar(dialogo: Dialogo, evento: FocusEvent): void {

    const elemento = evento.target as HTMLDivElement;
    const titulo = elemento.innerText.trim();

    if (!titulo) {
      elemento.innerText = dialogo.titulo;
      return;
    }

    this.dialogoServicio.actualizarTitulo(
      dialogo.id,
      titulo
    );
  }

  public cerrar(dialogo: Dialogo): void {
    this.dialogoServicio.eliminar(dialogo.id);
  }
  public estaMinimizado(idDialogo: string): boolean {
    return this.dialogoServicio.estaMinimizado(idDialogo)
  }

  //#endregion
}
