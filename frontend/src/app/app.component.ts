import { Component, inject, Type } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CargadorComponent } from './componentes/cargador/cargador.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { DialogoServicio } from './recursos/dialogo.servicio';
import { FormularioUsuario } from './formularios/formulario-usuario/formulario-usuario';
import { Socket } from './recursos/socket';
import { ServicioUsuario } from './servicios/servicio-usuario';
import { Cargador } from './recursos/cargador';
import { Autenticador, Sesion } from './recursos/autenticador';
import { Notificador } from './recursos/notificador';
import { PanelSuscripciones } from './paneles/panel-suscripciones/panel-suscripciones.componente';
import { PanelLocalizaciones } from './paneles/panel-localizaciones/panel-localizaciones.componente';
import { MatBadgeModule } from '@angular/material/badge';
import { PanelEventos } from './paneles/panel-eventos/panel-eventos.componente';

export interface Notificacion {
  clave: string,
  origen: string,
  descripcion: string,
  fecha: string,
  atendida: boolean
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CargadorComponent, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule, MatMenuModule, MatBadgeModule],
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

  public notificaciones: any[] = []

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


    this.socket.notificaciones$
      .subscribe(notificaciones => {
        this.notificaciones = notificaciones;
        this.totalNotificacionesPendientes = notificaciones.filter(
          (n: any) => n.atendida === null || n.atendida === false
        ).length;
      });
  }

  public totalNotificacionesPendientes = 0;

  get notificacionesOrdenadas(): Notificacion[] {
    return [...this.notificaciones].sort((a, b) => {

      const prioridad = (atendida: boolean | null): number => {
        if (atendida === null) {
          return 0;
        }

        if (atendida === false) {
          return 1;
        }

        return 2;
      };

      return prioridad(a.atendida) - prioridad(b.atendida);

    });
  }

  public cambiarEstado(notificacion: any): void {
    this.socket.emitir(
      'solicitud/notificacion',
      { clave: notificacion.clave }
    );
  }

  public obtenerIconoNotificacion(origen: string): string {
    switch (origen) {
      case 'conexion': return 'cable';
      case 'alarma': return 'warning';
      case 'suscripcion': return 'hourglass_top';
      case 'sistema': return 'info';
      default: return 'notifications';
    }
  }

  public actualizarUsuario(): void {
    this.dialogoServicio.abrir({
      referencia: FormularioUsuario,
      titulo: 'Usuario',
      icono: 'person',
      largo: '450px',
      desactivarAutocerrado: true,
      parametros: 'A',
      datos: this.sesion,
      alFinalizar: this.finalizarActualizarUsuario.bind(this)
    });
  }

  private finalizarActualizarUsuario(respuesta: any) {
    if (respuesta?.resultado == true) {
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
  }

  public cerrarSesion(): void {
    this.servicioUsuario.cerrarSesion().subscribe({
      next: () => {
        this.autenticacionServicio.eliminarSesion();
        this.socket.desconectar();
        this.router.navigate(['/acceder']);
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }


  public verSuscripciones(): void {
    this.dialogoServicio.abrir({
      referencia: PanelSuscripciones,
      titulo: 'Suscripciones',
      icono: 'hourglass_top',
      largo: '900px',
      desactivarAutocerrado: true,
    });
  }

  public verEventos(): void {
    this.dialogoServicio.abrir({
      referencia: PanelEventos,
      titulo: 'Eventos',
      icono: 'event',
      largo: '900px',
      desactivarAutocerrado: true,
    });
  }

  public verHistorial(): void {
    this.dialogoServicio.abrir({
      referencia: PanelLocalizaciones,
      titulo: 'Localizaciones',
      icono: 'map_search',
      largo: '900px',
      desactivarAutocerrado: true,
    });
  }

  //#endregion

  //#region Ventanas

  public restaurar(idDialogo: string): void {
    this.dialogoServicio.abrirDialogo(idDialogo)
  }

  public editar(dialogo: any, evento: FocusEvent): void {

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

  public cerrar(dialogo: any): void {
    this.dialogoServicio.eliminar(dialogo.id);
  }

  public estaMinimizado(idDialogo: string): boolean {
    return this.dialogoServicio.estaMinimizado(idDialogo)
  }

  //#endregion
}
