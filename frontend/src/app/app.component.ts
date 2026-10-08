import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RUTAS_NAVEGACION_ADMINISTRADOR, RutaNavegacion } from './recursos/constantes';
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
import { TemaServicio } from './recursos/tema.servicio';
import { DialogoConfirmacion } from './dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { PanelSuscripciones } from './paneles/panel-suscripciones/panel-suscripciones.componente';
import { PanelLocalizaciones } from './paneles/panel-localizaciones/panel-localizaciones.componente';
import { MatBadgeModule } from '@angular/material/badge';
import { PanelEventos } from './paneles/panel-eventos/panel-eventos.componente';
import { FormularioAdministradorPerfil } from './formularios/formulario-administrador-perfil/formulario-administrador-perfil';
import { MatSidenavModule } from '@angular/material/sidenav';

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
  imports:
    [
      RouterOutlet,
      CargadorComponent,
      MatToolbarModule,
      MatButtonModule,
      MatIconModule,
      MatTooltipModule,
      MatChipsModule,
      MatMenuModule,
      MatBadgeModule,
      MatSidenavModule
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {

  private socket = inject(Socket);
  private autenticacionServicio = inject(Autenticador);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public autenticado = false;
  public dialogoServicio = inject(DialogoServicio)
  public sesion!: Sesion

  /** Rutas de navegación mostradas en el toolbar (solo administrador). */
  public rutasNavegacion: RutaNavegacion[] = RUTAS_NAVEGACION_ADMINISTRADOR;

  public cargador = inject(Cargador)
  public notificador = inject(Notificador)

  public servicioUsuario = inject(ServicioUsuario)
  public autenticador = inject(Autenticador)
  public temaServicio = inject(TemaServicio)

  public notificaciones: any[] = []

  private sugerenciaTemaMostrada = false;

  //#region  Usuario

  ngOnInit() {

    this.temaServicio.inicializar();

    this.autenticacionServicio.autenticado$
      .subscribe(valor => {
        this.autenticado = valor;
        if (valor) {
          const sesion = this.autenticacionServicio.obtenerSesion()
          if (sesion != null) {
            this.sesion = sesion
            if (sesion.tipoCuenta === 'administrador') {
              this.socket.desconectar();
              this.notificaciones = [];
              this.totalNotificacionesPendientes = 0;
            } else {
              this.socket.conectar();
            }
          }
        } else {
          this.socket.desconectar();
        }
        this.cdr.detectChanges();
      });

    // Sugerir el tema del mes al llegar a la pantalla principal (una vez).
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd))
      .subscribe((evento) => {
        const url = (evento as NavigationEnd).urlAfterRedirects;
        if (url.startsWith('/inicio') && !this.sugerenciaTemaMostrada) {
          this.sugerenciaTemaMostrada = true;
          setTimeout(() => this.sugerirTemaDelMes(), 400);
        }
      });


    this.socket.notificaciones$
      .subscribe(notificaciones => {
        this.notificaciones = notificaciones;
        this.totalNotificacionesPendientes = notificaciones.filter(
          (n: any) => n.atendida === null || n.atendida === false
        ).length;
        this.cdr.detectChanges();
      });
  }

  /**
   * Si el mes actual tiene un tema sugerido y el usuario no ha respondido
   * aún este mes, abre un diálogo de confirmación para aplicarlo.
   */
  private sugerirTemaDelMes(): void {
    const sugerido = this.temaServicio.obtenerTemaSugeridoDelMes();

    if (!sugerido) {
      return;
    }

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Tema del mes',
      icono: 'palette',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      recordar: false,
      parametros: {
        titulo: 'Tema del mes',
        mensaje: `¿Desea cambiar al tema "${sugerido.nombre}" para este mes?`,
        textoSi: 'Sí, cambiar',
        textoNo: 'No, gracias'
      },
      datos: { clave: sugerido.clave },
      alFinalizar: this.finalizarSugerenciaTema.bind(this)
    });
  }

  private finalizarSugerenciaTema(respuesta: any): void {
    // El usuario respondió (sí o no): no volver a preguntar este mes.
    this.temaServicio.marcarSugerenciaRespondida();

    if (respuesta?.resultado === true) {
      this.temaServicio.aplicar(respuesta.datos.clave);
    }
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
    if (this.sesion.tipoCuenta === 'administrador') {
      this.dialogoServicio.abrir({
        referencia: FormularioAdministradorPerfil,
        titulo: 'Administrador',
        icono: 'admin_panel_settings',
        largo: 'l35%,m55%,c100%',
        desactivarAutocerrado: true,
        recordar: false
      });
      return;
    }

    this.dialogoServicio.abrir({
      referencia: FormularioUsuario,
      titulo: 'Usuario',
      icono: 'person',
      largo: 'l35%,m55%,c100%',
      desactivarAutocerrado: true,
      parametros: 'A',
      datos: {
        ...this.sesion,
        clave: this.sesion.claveUsuario
      },
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
            this.dialogoServicio.eliminarTodos();
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
        this.dialogoServicio.eliminarTodos();
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
      largo: 'l70%,m90%,c100%',
      desactivarAutocerrado: true,
    });
  }

  public verEventos(): void {
    this.dialogoServicio.abrir({
      referencia: PanelEventos,
      titulo: 'Eventos',
      icono: 'event',
      largo: 'l70%,m90%,c100%',
      desactivarAutocerrado: true,
    });
  }

  public verHistorial(): void {
    this.dialogoServicio.abrir({
      referencia: PanelLocalizaciones,
      titulo: 'Localizaciones',
      icono: 'map_search',
      largo: 'l70%,m90%,c100%',
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