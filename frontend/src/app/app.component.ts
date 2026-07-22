import { Component, inject, Type } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CargadorComponent } from './componentes/cargador/cargador.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { AutenticacionServicio, Sesion } from './servicios/autenticacion.servicio';
import { SocketServicio } from './servicios/socket.servicio';
import { UsuarioDialog } from './dialogos/usuario/usuario.dialog';
import { UsuarioServicio } from './servicios/usuario.servicio';
import { NotificadorServicio } from './servicios/notificador.servicio';
import { CargadorServicio } from './servicios/cargador.servicio';
import { DialogoMinimizado, DialogoServicio } from './servicios/dialogo.servicio';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { PanelSuscripciones } from './paneles/panel-suscripciones/panel-suscripciones.componente';
import { PanelLocalizaciones } from './paneles/panel-localizaciones/panel-localizaciones.componente';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CargadorComponent, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule, MatButtonModule, MatMenuModule],
  template: `

    @if(autenticado){
        <mat-toolbar class="toolbar-inicio">
          <img src="logo.svg" alt="SGALA" class="logo" />
          <span style="flex: 1;"></span>


          <button mat-icon-button (click)="abrirPanelUsuario()">
            <mat-icon>person</mat-icon>
          </button>

          <h2 style="font-size: 18px;">{{sesion.alias}}</h2>
          <button mat-icon-button matTooltip="Cerrar sesión" (click)="cerrarSesion()" style="margin-left: 30px;">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
    }

    <div class="router-container">
      <router-outlet />
    </div>

        @if(autenticado){
          <div class="contenedor-dialogos">
          @for(dialogo of dialogoServicio.dialogos(); track dialogo.id) {
          <div class="chip-dialogo">
            <button
              mat-icon-button
              class="chip-boton"
              matTooltip="Restaurar"
              (click)="restaurar(dialogo)">
              <mat-icon>{{ dialogo.icono }}</mat-icon>
            </button>

            <div
              class="chip-titulo"
              contenteditable="true"
              spellcheck="false"
              (blur)="editar(dialogo, $event)">
              {{ dialogo.titulo }}
            </div>

            <button
              mat-icon-button
              class="chip-boton"
              [matMenuTriggerFor]="menuCerrar">
              <mat-icon>close</mat-icon>
            </button>

            <mat-menu #menuCerrar="matMenu">
              <button mat-menu-item (click)="cerrar(dialogo)">
                <mat-icon>check</mat-icon>
                <span>Sí</span>
              </button>

              <button mat-menu-item>
                <mat-icon>close</mat-icon>
                <span>No</span>
              </button>
            </mat-menu>

          </div>
        }
</div>
  }

    <app-cargador />
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {

  private socketService = inject(SocketServicio);
  private usuarioServicio = inject(UsuarioServicio);
  private autenticacionServicio = inject(AutenticacionServicio);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notificadorServicio = inject(NotificadorServicio);
  public autenticado = false;
  public dialogoServicio = inject(DialogoServicio)
  public sesion!: Sesion
  private cargadorServicio = inject(CargadorServicio);


  private paneles = {
    _PanelLocalizaciones: PanelLocalizaciones,
    _PanelSuscripciones: PanelSuscripciones
  } as Record<string, Type<any>>;

  ngOnInit() {
    this.autenticacionServicio.autenticado$
      .subscribe(valor => {
        this.autenticado = valor;
        if (valor) {
          this.socketService.conectar();
          const sesion = this.autenticacionServicio.obtenerSesion()
          if (sesion != null) {
            this.sesion = sesion
          }
        } else {
          this.socketService.desconectar();
        }
      });
  }

  public abrirPanelUsuario(): void {
    const dialogRef = this.dialog.open(UsuarioDialog, {
      width: '420px',
      data: {
        accion: 'A',
        datos: this.sesion
      }
    });
    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta == true) {
        this.cargadorServicio.mostrar()
        setTimeout(() => {
          this.notificadorServicio.advertencia("Debes iniciar sesión nuevamente.")
        }, 2000);
        setTimeout(() => {
          this.cargadorServicio.ocultar()
          this.cerrarSesion();
        }, 5000);
      }
    });
  }

  public cerrarSesion(): void {
    this.usuarioServicio.cerrarSesion().subscribe({
      next: () => {
        this.autenticacionServicio.eliminarSesion();
        this.socketService.desconectar();
        this.router.navigate(['/iniciar-sesion']);
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }

  public restaurar(dialogo: any): void {


    if (dialogo.referencia) {

      dialogo.referencia.updatePosition({});

      if (dialogo.expandido) {
        dialogo.referencia.updateSize('100vw', '100vh');
      }

      // quitar del listado de minimizados
      this.dialogoServicio.eliminar(dialogo.id);

      return;
    } else {

      const componente = this.paneles[dialogo.componente];

      if (!componente) {
        console.error('No existe panel:', dialogo.componente);
        return;
      }

      dialogo.referencia = this.dialog.open(componente, {
        width: '850px',
        maxWidth: '100vw',
        maxHeight: '100vh',
        disableClose: true,
        data: dialogo.datos
      });

      dialogo.referencia.componentInstance.datos = dialogo.datos;
      // dialogo.referencia.componentInstance.filtros = dialogo.filtros;

    }
  }

  public editar(dialogo: DialogoMinimizado, evento: FocusEvent): void {

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

  public cerrar(dialogo: DialogoMinimizado): void {
    dialogo.referencia?.close();
    this.dialogoServicio.eliminar(dialogo.id);
  }

}
