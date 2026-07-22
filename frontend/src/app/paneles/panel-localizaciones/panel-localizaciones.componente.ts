import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { DispositivoServicio } from '../../servicios/dispositivo.servicio';
import { DialogoServicio } from '../../servicios/dialogo.servicio';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablaComponent
  ],
  templateUrl: './panel-localizaciones.componente.html',
  styleUrl: './panel-localizaciones.componente.scss'
})
export class PanelLocalizaciones {

  private dialogoReferencia = inject(MatDialogRef<PanelLocalizaciones>);
  private cargadorServicio = inject(CargadorServicio)
  private dispositivoServicio = inject(DispositivoServicio)
  protected claveDispositivo = inject<string>(MAT_DIALOG_DATA);

  private dialogoServicio = inject(DialogoServicio)


  public columnas: Columna[] = [
    { clave: 'aliasDispositivo', titulo: 'Dispositivo', formato: 'texto' },
    { clave: 'latitud', titulo: 'Latitud', formato: 'texto' },
    { clave: 'longitud', titulo: 'Longitud', formato: 'texto' },
    { clave: 'altitud', titulo: 'Altitud', formato: 'texto' },
    {
      clave: 'accciones', titulo: '', formato: 'botones',
      botones: [
        {
          icono: 'navigation',
          tooltip: () => 'Ver localización',
          accion: (fila) => this.verLocalizacion(fila),
        },
      ]
    },
  ];

  public datos: any[] = [];

  public textoFiltro = '';
  public filtros: Filtros = {
    etiqueta: 'Filtrar localizaciones',
    marcador: 'Filtrar por latitud, longitud y altitud.',
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
    this.dispositivoServicio.obtenerLocalizaciones(this.claveDispositivo).subscribe({
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

  public verLocalizacion(datos: any): void {

    if (datos.latitud == null || datos.longitud == null) {
      return;
    }

    const url = `https://www.google.com/maps?q=${datos.latitud},${datos.longitud}`;

    window.open(url, '_blank');
  }

  public cerrar() {
    this.dialogoReferencia.close()
  }


  private redimensionando = false;

  private anchoInicial = 0;
  private altoInicial = 0;

  private mouseXInicial = 0;
  private mouseYInicial = 0;

  public expandido = false;

  public expandirContraer() {

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
        '600px',
        'auto'
      );

    }

  }

  public iniciarResize(evento: MouseEvent): void {

    if (this.expandido) {
      return;
    }

    evento.preventDefault();

    this.redimensionando = true;

    const elemento = document.querySelector(
      '.mat-mdc-dialog-container'
    ) as HTMLElement;


    this.anchoInicial = elemento.offsetWidth;
    this.altoInicial = elemento.offsetHeight;

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

  };

  private resize = (evento: MouseEvent): void => {

    if (!this.redimensionando) {
      return;
    }


    const ancho =
      this.anchoInicial +
      (evento.clientX - this.mouseXInicial);


    const alto =
      this.altoInicial +
      (evento.clientY - this.mouseYInicial);


    this.dialogoReferencia.updateSize(
      `${ancho}px`,
      `${alto}px`
    );

  };

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
      titulo: 'Localizaciones',
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

