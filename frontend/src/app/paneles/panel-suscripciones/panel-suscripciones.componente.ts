import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogoSuscripcion } from '../../dialogos/suscripcion/dialogo-suscripcion';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { DatosServicio } from '../../servicios/datos.servicio';
import { DialogoServicio } from '../../servicios/dialogo.servicio';

@Component({
  selector: 'app-suscripciones',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablaComponent
  ],
  templateUrl: './panel-suscripciones.componente.html',
  styleUrl: './panel-suscripciones.componente.scss',
})
export class PanelSuscripciones {

  private dialogoReferencia = inject(MatDialogRef<PanelSuscripciones>);
  private dialogo = inject(MatDialog);
  private cargadorServicio = inject(CargadorServicio)
  private datosServicio = inject(DatosServicio)
  private dialogoServicio = inject(DialogoServicio)

  public columnas: Columna[] = [
    { clave: 'clave', titulo: 'Clave', formato: 'texto' },
    { clave: 'aliasDispositivo', titulo: 'Dispositivo', formato: 'texto' },
    { clave: 'tipoTexto', titulo: 'Tipo', formato: 'texto' },
    { clave: 'fechaInicial', titulo: 'Fecha inicial', formato: 'fecha' },
    { clave: 'fechaFinal', titulo: 'Fecha final', formato: 'fecha' },
    {
      clave: 'accciones', titulo: '', formato: 'botones',
      botones: [
        {
          icono: 'download',
          tooltip: (fila) => this.tieneFactura(fila) == true ? 'Descargar factura' : 'No tiene factura',
          accion: (fila) => this.descargarFactura(fila),
          estado: (fila) => this.tieneFactura(fila),
        },
      ]
    },
  ];

  public datos: any[] = [];

  public textoFiltro = '';
  public filtros: Filtros = {
    etiqueta: 'Filtrar suscripciones',
    marcador: 'Filtrar por Clave, Dispositivo y Fecha inicial o final',
    botones: [
      {
        icono: 'add',
        texto: 'Nueva',
        accion: () => this.crearSuscripcion()
      }
    ]
  }

  constructor(
  ) {
  }

  ngOnInit() {
    if (this.datos.length == 0) {
      this.cargarDatos();
    }
  }

  public cargarDatos() {
    this.cargadorServicio.mostrar();
    this.datosServicio.obtenerSuscripciones().subscribe({
      next: (respuesta) => {
        this.cargadorServicio.ocultar();
        this.datos = respuesta.datos
      },
      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      }
    })
  }

  public crearSuscripcion() {
    const dialogoReferencia = this.dialogo.open(DialogoSuscripcion, {
      width: '550px',
      disableClose: true,
    });

    dialogoReferencia.afterClosed().subscribe((respuesta?: boolean) => {
      if (respuesta === true) {
        this.cargarDatos()
      }
    });
  }

  public descargarFactura(datos: any) {
    console.log(datos)
  }

  public tieneFactura(fila: any): boolean {
    return fila.clave == null ? false : true;
  }

  public cerrar() {
    this.dialogoReferencia.close()
  }

  public expandido = false;
  public expandirContraer() {

    this.expandido = !this.expandido;
    if (this.expandido) {
      this.dialogoReferencia.updateSize('100vw', '100vh');
      this.dialogoReferencia.updatePosition({
        top: '0',
        left: '0'
      });
    } else {
      this.dialogoReferencia.updateSize('600px', 'auto');
      this.dialogoReferencia.updatePosition({});
    }

  }



  private moviendo = false;

  private posicionX = 0;
  private posicionY = 0;

  private inicioX = 0;
  private inicioY = 0;
  public iniciarArrastre(evento: MouseEvent): void {

    this.moviendo = true;

    const posicion = evento.currentTarget as HTMLElement;

    this.inicioX = evento.clientX;
    this.inicioY = evento.clientY;


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


    const diferenciaX = evento.clientX - this.inicioX;
    const diferenciaY = evento.clientY - this.inicioY;


    this.dialogoReferencia.updatePosition({
      left: `${diferenciaX}px`,
      top: `${diferenciaY}px`
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

  };


  public minimizar() {

    this.dialogoReferencia.updatePosition({
      bottom: '-10000px',
      left: '-10000px'
    });

    this.dialogoServicio.agregar({
      id: crypto.randomUUID(),
      titulo: 'Suscripciones',
      icono: 'history',
      filtros: [{
        textoFiltro: this.textoFiltro
      }],
      datos: this.datos,
      referencia: this.dialogoReferencia,
      expandido: this.expandido
    });
  }

}
