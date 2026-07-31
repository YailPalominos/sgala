import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { MatDialog } from '@angular/material/dialog';
import { ServicioDatos } from '../../servicios/servicio-datos';
import { EstadoDialogo } from '../../recursos/dialogo.contenedor';
import { FormularioSuscripcion } from '../../formularios/formulario-suscripcion/formulario-suscripcion';
import { Panel } from '../../recursos/dialogo.base.panel';

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

  private dialogo = inject(MatDialog);
  private servicioDatos = inject(ServicioDatos)

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

  public datos = signal<any[]>([])
  public filtros = signal<Filtros>({
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
    this.servicioDatos.obtenerSuscripciones().subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.datos);
      }
    })
  }

  public crearSuscripcion() {
    const dialogoReferencia = this.dialogo.open(FormularioSuscripcion, {
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
  }

  public tieneFactura(fila: any): boolean {
    return fila.clave == null ? false : true;
  }

}
