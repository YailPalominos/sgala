import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { ServicioEvento } from '../../servicios/servicio-evento';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMaskDirective } from 'ngx-mask';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { DialogoComparacion } from '../../dialogos/dilogo-comparacion/dialogo-comparacion';
import { MatSelectModule } from '@angular/material/select';
import { Autenticador } from '../../recursos/autenticador';

interface EventoAdministrador {
  id: number;
  fecha: string;
  accion: string;
  aliasAdministrador: string;
  correoAdministrador: string;
  fechaTexto: string;
}

@Component({
  selector: 'app-pagina-eventos-administradores',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ReactiveFormsModule,
    TablaComponent,
    MatDatepickerModule,
    NgxMaskDirective,
    MatSelectModule,
  ],
  templateUrl: './pagina-eventos.html'
})
export class PaginaEventos implements OnInit {
  private readonly servicioEventos = inject(ServicioEvento);
  private readonly dialgo = inject(DialogoServicio);
  private readonly autenticador = inject(Autenticador);

  esAdministrador = this.autenticador.obtenerSesion()?.tipoCuenta === 'administrador';

  datos = signal<any[]>([]);

  readonly filtrosExpandido = signal(false);
  readonly filtros = signal<Filtros>({
    etiqueta: 'Buscar',
    marcador: '',
    texto: '',
  });
  readonly formularioFiltros = new FormGroup({
    fechaInicial: new FormControl(''),
    fechaFinal: new FormControl(''),
    horaInicial: new FormControl(''),
    horaFinal: new FormControl(''),
    descripcion: new FormControl(''),
    id: new FormControl(''),
    tipo: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'Id', formato: 'texto' },
    { clave: 'fecha', titulo: 'Fecha', formato: 'fecha' },
    { clave: 'descripcion', titulo: 'Descripcion', formato: 'texto' },
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

  ngOnInit(): void {
    this.cargar();
    this
  }

  intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  buscar(): void {
    const criterios = Object.fromEntries(
      Object.entries(this.formularioFiltros.getRawValue())
        .filter(([, valor]) => Boolean(valor?.trim()))
        .map(([clave, valor]) => [clave, valor!.trim()])
    );

  }

  reiniciarFiltros(): void {
    this.formularioFiltros.reset()
  }

  cargar(): void {
    const filtros = this.formularioFiltros.getRawValue()
    this.servicioEventos.obtenerLista(filtros).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.datos || []);
      },
    });
  }




  async abrirFiltros() {

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

    this.servicioEventos.obtenerDatosElemento(elemento.idElemento).subscribe({
      next: (respuesta) => {

        this.dialgo.abrir({
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