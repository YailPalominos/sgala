import { Component, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { Panel } from '../../recursos/dialogo.panel';
import { MatSelectModule } from '@angular/material/select';
import { FiltroServicio } from '../../recursos/filtros.servicio';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablaComponent,
    MatSelectModule,
    FormsModule
  ],
  templateUrl: './panel-localizaciones.componente.html'
})
export class PanelLocalizaciones extends Panel {


  @ViewChild('filtrosTemplate')
  filtrosTemplate!: TemplateRef<any>;

  private servicioDispositivio = inject(ServicioDispositivo)

  private filtrosServicio = inject(FiltroServicio)

  public override filtros = signal<Filtros>({
    etiqueta: 'Filtrar localizaciones',
    marcador: 'Filtrar por latitud, longitud y altitud.',
    texto: '',
    botones: [
      {
        icono: 'filter_alt',
        texto: 'Filtros',
        accion: () => this.abrirFiltros()
      }
    ]
  });
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
  public override registros = signal<any[]>([]);
  public dispositivos: any[] = []


  public override panelFiltros = new FormGroup({
    claveDispositivo: new FormControl(''),
  });

  protected override iniciar(): void {
    this.servicioDispositivio.obtenerListaDispositivosUsuario().subscribe({
      next: (respuesta) => {
        this.dispositivos = respuesta.datos
        this.cargarDatos()
      }
    })
  }

  private cargarDatos() {
    this.servicioDispositivio.obtenerLista(this.panelFiltros.getRawValue()).subscribe({
      next: (respuesta) => {
        this.registros.set(respuesta.datos);
      }
    })
  }

  async abrirFiltros() {
    await this.filtrosServicio.abrir(
      this.filtrosTemplate
    );
    this.cargarDatos()
  }

  public verLocalizacion(datos: any): void {
    if (datos.latitud == null || datos.longitud == null) {
      return;
    }
    const url = `https://www.google.com/maps?q=${datos.latitud},${datos.longitud}`;
    window.open(url, '_blank');
  }
}

