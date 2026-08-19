import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { FormularioSuscripcion } from '../../formularios/formulario-suscripcion/formulario-suscripcion';
import { Panel } from '../../recursos/dialogo.panel';
import { ServicioSuscripciones } from '../../servicios/servicio-suscripciones';
import { DialogoServicio } from '../../recursos/dialogo.servicio';

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
  templateUrl: './panel-suscripciones.componente.html'
})
export class PanelSuscripciones extends Panel {

  private servicioSuscripciones = inject(ServicioSuscripciones)
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
  public override registros = signal<any[]>([]);
  public override filtros = signal<Filtros>({
    etiqueta: 'Filtrar suscripciones',
    marcador: 'Filtrar por Clave, Dispositivo y Fecha inicial o final',
    texto: '',
    botones: [
      {
        icono: 'add',
        texto: 'Nueva',
        accion: () => this.crearSuscripcion()
      }
    ]
  })

  override iniciar(): void {
    this.cargarDatos()
  }

  public cargarDatos() {
    this.servicioSuscripciones.obtenerLista({ hola: 'adsdasdas' }).subscribe({
      next: (respuesta) => {
        this.registros.set(respuesta.datos);
      }
    })
  }

  public crearSuscripcion() {
    this.dialogoServicio.abrir({
      referencia: FormularioSuscripcion,
      titulo: 'Suscripciones',
      icono: 'event',
      ancho: '500px',
      desactivarAutocerrado: true,
      alFinalizar: this.finalizarConfirmacion,
      clase: this.constructor.name,
    });

  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      this.cargarDatos()
    }
  }


  public descargarFactura(datos: any) {
  }

  public tieneFactura(fila: any): boolean {
    return fila.clave == null ? false : true;
  }

}
