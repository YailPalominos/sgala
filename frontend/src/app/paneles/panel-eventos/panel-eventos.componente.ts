import { Component, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, TablaComponent } from '../../componentes/tabla/tabla.component';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { Panel } from '../../recursos/dialogo.panel';
import { MatSelectModule } from '@angular/material/select';
import { FiltroServicio } from '../../recursos/filtros.servicio';
import { ServicioEvento } from '../../servicios/servicio-evento';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { DialogoComparacion } from '../../dialogos/dilogo-comparacion/dialogo-comparacion';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablaComponent,
    MatSelectModule,
    MatDatepickerModule,
    FormsModule
  ],
  templateUrl: './panel-eventos.componente.html',
  providers: [provideNativeDateAdapter()],
})
export class PanelEventos extends Panel {

  @ViewChild('filtrosTemplate')
  filtrosTemplate!: TemplateRef<any>;

  private servicioDispositivo = inject(ServicioDispositivo)
  private servicioEvento = inject(ServicioEvento)
  private filtrosServicio = inject(FiltroServicio)
  private dialogoServicio = inject(DialogoServicio)

  public columnas: Columna[] = [
    { clave: 'id', titulo: 'Id', formato: 'texto' },
    { clave: 'fecha', titulo: 'Fecha', formato: 'fecha' },
    { clave: 'descripcion', titulo: 'Descripción', formato: 'texto' },
    {
      clave: 'accciones', titulo: '', formato: 'botones', estilos: "display: flex;justify-content: flex-end;",
      botones: [
        {
          icono: 'visibility',
          tooltip: () => "Ver los datos actualizados o modificados.",
          accion: (fila) => this.cargarElemento(fila),
          visible: (fila) => this.tieneElemento(fila),
          estilos: (fila) => this.estilosPorTipo(fila),
        },
      ]
    },
  ];
  public override registros = signal<any[]>([]);
  public dispositivos: any[] = []

  public override panelFiltros = new FormGroup({
    descripcion: new FormControl(''),
    fechaInicial: new FormControl(''),
    fechaFinal: new FormControl(''),
    horaInicial: new FormControl(''),
    horaFinal: new FormControl(''),
  });

  protected override iniciar(): void {
    this.servicioDispositivo.obtenerListaDispositivosUsuario().subscribe({
      next: (respuesta) => {
        this.dispositivos = respuesta.datos
        this.cargarDatos()
      }
    })
  }

  public cargarDatos() {
    this.servicioEvento.obtenerLista(this.panelFiltros.getRawValue()).subscribe({
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

  public tieneElemento(fila: any): boolean {
    return fila.idElemento == null ? false : true;
  }

  public estilosPorTipo(fila: any): string {
    if (fila.idElemento == null) {
      return '';
    }

    const descripcion = fila.descripcion
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (descripcion?.includes('creo')) {
      return 'background: #e8f5e9;';
    }

    if (descripcion?.includes('actualizo')) {
      return 'background: #fff3e0;';
    }

    return '';
  }
  public cargarElemento(elemento: any) {

    this.servicioEvento.obtenerDatosElemento(elemento.idElemento).subscribe({
      next: (respuesta) => {

        this.dialogoServicio.abrir({
          referencia: DialogoComparacion,
          titulo: 'Comparación',
          icono: 'compare_arrows',
          largo: 'l50%,m70%,c100%',
          desactivarAutocerrado: true,
          parametros: 'A',
          datos: respuesta.datos
        });

      }
    })
  }

}

