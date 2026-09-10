import { CommonModule } from "@angular/common";
import { Component, ComponentRef, inject, Inject, Type, ViewChild, ViewContainerRef } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { Dialogo } from "./dialogo.base";
import { DialogoServicio } from "./dialogo.servicio";

export interface EstadoDialogo {
  datos?: any;
  filtros?: any;
}

@Component({
  selector: 'app-dialogo-contenedor',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
<div class="dialogo-contenedor">
  
  <div 
    class="barra-dialogo"
    (mousedown)="iniciarArrastre($event)"
    [class.moviendo]="moviendo"
  >

    <div class="barra-izquierda">
    </div>

    <h1>
      {{ data.titulo }}
    </h1>

    <div class="barra-derecha">
      <button
        mat-icon-button
        class="btn-intercalar-fijar"
        matTooltip="{{ fijado ? 'Desfijar' : 'Fijar' }}"
        (click)="intercalarFijar()">
        <mat-icon>{{ fijado ? 'circle' : 'radio_button_unchecked' }}</mat-icon>
      </button>

      <button
        mat-icon-button
        class="btn-minimizar"
        matTooltip="Minimizar"
        (click)="minimizar()"
        [style.display]="data.recordar === false ? 'none' : ''"
        [disabled]="fijado">
        <mat-icon>remove</mat-icon>
      </button>

      <button
        mat-icon-button
        class="btn-expandir"
        matTooltip="Expandir"
        (click)="expandirContraer()"
        [disabled]="fijado">
        <mat-icon>
          {{ expandido ? 'fullscreen_exit' : 'fullscreen' }}
        </mat-icon>
      </button>

      <button
        mat-icon-button
        class="btn-cerrar"
        matTooltip="Cerrar"
        [matMenuTriggerFor]="menuCerrar"
        [disabled]="fijado">
        <mat-icon>close</mat-icon>
      </button>

      <mat-menu #menuCerrar="matMenu">
        <button mat-menu-item (click)="eliminar()">
          <mat-icon>check</mat-icon>
          <span>Sí</span>
        </button>
        <button mat-menu-item>
          <mat-icon>close</mat-icon>
          <span>No</span>
        </button>
      </mat-menu>
    </div>

  </div>

  <ng-container #contenedor></ng-container>

  <div
    class="resize resize-top"
    (mousedown)="iniciarResize($event, 'top')">
  </div>

  <div
    class="resize resize-right"
    (mousedown)="iniciarResize($event, 'right')">
  </div>

  <div
    class="resize resize-bottom"
    (mousedown)="iniciarResize($event, 'bottom')">
  </div>

  <div
    class="resize resize-left"
    (mousedown)="iniciarResize($event, 'left')">
  </div>

  <div
    class="resize resize-top-left"
    (mousedown)="iniciarResize($event, 'top-left')">
  </div>

  <div
    class="resize resize-top-right"
    (mousedown)="iniciarResize($event, 'top-right')">
  </div>

  <div
    class="resize resize-bottom-right"
    (mousedown)="iniciarResize($event, 'bottom-right')">
  </div>

  <div
    class="resize resize-bottom-left"
    (mousedown)="iniciarResize($event, 'bottom-left')">
  </div>

</div>
`
})
export class DialogoContenedorComponent {

  public expandido = false;

  public fijado = false;

  private redimensionando = false;

  private anchoInicial = 0;
  private altoInicial = 0;

  private mouseXInicial = 0;
  private mouseYInicial = 0;

  public moviendo = false;

  private inicioX = 0;
  private inicioY = 0;

  @ViewChild('contenedor', {
    read: ViewContainerRef,
    static: true
  })
  private contenedor!: ViewContainerRef;
  private componenteRef!: ComponentRef<Dialogo>
  private dialogoServicio = inject(DialogoServicio)
  private resultadoDialogo: any = undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: any,
    private dialogoReferencia:
      MatDialogRef<DialogoContenedorComponent>
  ) {
    this.expandido = this.data.expandido ?? false;
  }

  ngAfterViewInit(): void {

    this.componenteRef = this.contenedor.createComponent(
      this.data.componente as Type<Dialogo>
    );

    const instancia = this.componenteRef.instance;
    instancia.parametros = this.data.data;
    instancia.datos = this.data.datos;


    // console.log(this.data)

    instancia.cargar();

    this.componenteRef.instance.cambioEstado$
      .subscribe((estado: EstadoDialogo) => {
        this.dialogoServicio.actualizarEstadoDialogo(
          this.data.id,
          {
            datos: estado.datos,
            filtros: estado.filtros
          }
        );
      });

    this.componenteRef.instance.cerrarDialogo$.subscribe(resultado => {
      this.resultadoDialogo = resultado;
      this.cerrar()
    });

    this.restaurarEstadoContenedor();
  }


  private restaurarEstadoContenedor(): void {

    const estado = this.data;


    if (estado.expandido) {

      setTimeout(() => {

        this.dialogoReferencia.updateSize(
          '100vw',
          '100vh'
        );

        this.dialogoReferencia.updatePosition({
          top: '0',
          left: '0'
        });

      });

      return;
    }


    // Tamaño guardado
    if (
      estado.ancho &&
      estado.alto
    ) {

      this.dialogoReferencia.updateSize(
        `${estado.ancho}px`,
        `${estado.alto}px`
      );

    }


    // Posición guardada
    if (
      estado.posicionX &&
      estado.posicionY
    ) {

      this.dialogoReferencia.updatePosition({

        left:
          `${estado.posicionX}px`,

        top:
          `${estado.posicionY}px`

      });

    }

  }

  private obtenerEstado(): any {

    const elemento =
      document.querySelector(
        '.mat-mdc-dialog-container'
      ) as HTMLElement;


    const rect =
      elemento.getBoundingClientRect();


    return {

      posicionX: rect.left,
      posicionY: rect.top,

      ancho: rect.width,
      alto: rect.height,

      expandido: this.expandido

    };

  }

  private actualizarEstadoContenedor(): void {
    const estado = this.obtenerEstado();
    this.dialogoServicio.actualizarEstadoContenedor(
      this.data.id,
      estado
    );
  }

  public minimizar(): void {
    this.dialogoReferencia.close({
      resultado: 'M',
      resultadoDialogo: undefined
    });
  }

  public cerrar(): void {
    this.dialogoReferencia.close({
      resultado: 'C',
      resultadoDialogo: {
        resultado: this.resultadoDialogo,
        parametros: this.data.data,
        datos: this.data.datos,
      },
    });
  }

  public eliminar(): void {
    this.dialogoReferencia.close({
      resultado: 'E',
      resultadoDialogo: undefined
    });
  }

  public reiniciar(): void {
    this.expandido = false;

    this.dialogoReferencia.updateSize(
      this.data.width ?? '850px',
      this.data.height ?? 'auto'
    );

    this.dialogoReferencia.updatePosition({
      top: undefined,
      left: undefined
    });

    this.actualizarEstadoContenedor();
  }

  public intercalarFijar(): void {
    this.fijado = !this.fijado;
  }


  public expandirContraer(): void {
    this.expandido = !this.expandido;

    if (this.expandido) {
      this.dialogoReferencia.updateSize(
        '100vw',
        '100vh'
      );
      this.dialogoReferencia.updatePosition({
        top: '0',
        left: '0'
      });
    } else {
      this.dialogoReferencia.updateSize(
        '850px',
        'auto'
      );
    }
    this.actualizarEstadoContenedor()
  }

  private direccionResize!:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top-left'
    | 'top-right'
    | 'bottom-right'
    | 'bottom-left';

  public iniciarResize(
    evento: MouseEvent,
    direccion:
      | 'top'
      | 'right'
      | 'bottom'
      | 'left'
      | 'top-left'
      | 'top-right'
      | 'bottom-right'
      | 'bottom-left'
  ): void {

    if (this.expandido) {
      return;
    }

    if (this.fijado) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();

    this.redimensionando = true;
    this.direccionResize = direccion;

    const elemento =
      document.querySelector(
        '.cdk-overlay-pane'
      ) as HTMLElement;

    const rect =
      elemento.getBoundingClientRect();

    this.anchoInicial = rect.width;
    this.altoInicial = rect.height;

    this.posicionInicialX = rect.left;
    this.posicionInicialY = rect.top;

    this.mouseXInicial = evento.clientX;
    this.mouseYInicial = evento.clientY;

    document.addEventListener(
      'mousemove',
      this.resize
    );

    document.addEventListener(
      'mouseup',
      this.detenerResize
    );

  }

  private resize = (evento: MouseEvent): void => {

    if (!this.redimensionando) {
      return;
    }

    const deltaX =
      evento.clientX - this.mouseXInicial;

    const deltaY =
      evento.clientY - this.mouseYInicial;

    let ancho = this.anchoInicial;
    let alto = this.altoInicial;

    let posicionX = this.posicionInicialX;
    let posicionY = this.posicionInicialY;

    switch (this.direccionResize) {

      case 'right':
        ancho += deltaX;
        break;

      case 'left':
        ancho -= deltaX;
        posicionX += deltaX;
        break;

      case 'bottom':
        alto += deltaY;
        break;

      case 'top':
        alto -= deltaY;
        posicionY += deltaY;
        break;

      case 'bottom-right':
        ancho += deltaX;
        alto += deltaY;
        break;

      case 'bottom-left':
        ancho -= deltaX;
        posicionX += deltaX;
        alto += deltaY;
        break;

      case 'top-right':
        ancho += deltaX;
        alto -= deltaY;
        posicionY += deltaY;
        break;

      case 'top-left':
        ancho -= deltaX;
        posicionX += deltaX;
        alto -= deltaY;
        posicionY += deltaY;
        break;

    }

    ancho = Math.max(400, ancho);
    alto = Math.max(250, alto);

    this.dialogoReferencia.updateSize(
      `${ancho}px`,
      `${alto}px`
    );

    this.dialogoReferencia.updatePosition({
      left: `${posicionX}px`,
      top: `${posicionY}px`
    });

  };

  private detenerResize = (): void => {

    this.redimensionando = false;

    document.removeEventListener(
      'mousemove',
      this.resize
    );

    document.removeEventListener(
      'mouseup',
      this.detenerResize
    );

    this.actualizarEstadoContenedor();

  };

  private posicionInicialX = 0;
  private posicionInicialY = 0;

  public iniciarArrastre(evento: MouseEvent): void {

    if (
      (evento.target as HTMLElement)
        .closest('button')
    ) {
      return;
    }

    if (this.fijado) {
      return;
    }

    evento.preventDefault();

    this.moviendo = true;


    const elemento =
      document.querySelector(
        '.mat-mdc-dialog-container'
      ) as HTMLElement;


    const rect =
      elemento.getBoundingClientRect();


    this.inicioX = evento.clientX;
    this.inicioY = evento.clientY;


    // Guardamos la posición actual del diálogo
    this.posicionInicialX = rect.left;
    this.posicionInicialY = rect.top;


    document.addEventListener(
      'mousemove',
      this.mover
    );


    document.addEventListener(
      'mouseup',
      this.detenerArrastre
    );

  }

  private mover = (evento: MouseEvent): void => {

    if (!this.moviendo) {
      return;
    }


    const diferenciaX =
      evento.clientX - this.inicioX;


    const diferenciaY =
      evento.clientY - this.inicioY;

    let nuevaX = this.posicionInicialX + diferenciaX;
    let nuevaY = this.posicionInicialY + diferenciaY;

    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;

    // No permitir que se salga por arriba
    if (nuevaY < 0) {
      nuevaY = 0;
    }

    // No permitir que se salga por abajo (dejar al menos 40px visibles)
    if (nuevaY > altoVentana - 40) {
      nuevaY = altoVentana - 40;
    }

    // No permitir que se salga por la izquierda (dejar al menos 100px visibles)
    if (nuevaX < -((this.anchoInicial || 400) - 100)) {
      nuevaX = -((this.anchoInicial || 400) - 100);
    }

    // No permitir que se salga por la derecha (dejar al menos 100px visibles)
    if (nuevaX > anchoVentana - 100) {
      nuevaX = anchoVentana - 100;
    }

    this.dialogoReferencia.updatePosition({

      left:
        `${nuevaX}px`,

      top:
        `${nuevaY}px`

    });

  };

  private detenerArrastre = (): void => {
    this.moviendo = false;

    document.removeEventListener(
      'mousemove',
      this.mover
    );


    document.removeEventListener(
      'mouseup',
      this.detenerArrastre
    );
    this.actualizarEstadoContenedor()
  };


}