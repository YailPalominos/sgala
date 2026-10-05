import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { NavegacionAdministracion } from '../../componentes/navegacion-administracion/navegacion-administracion';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

interface EventoAdministrativo {
  id: number;
  descripcion: string;
  fecha: string;
  aliasUsuario: string | null;
  fechaTexto: string;
}

@Component({
  selector: 'app-pagina-eventos-administracion',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatExpansionModule,
    ReactiveFormsModule,
    NavegacionAdministracion,
    TablaComponent
  ],
  templateUrl: './pagina-eventos-administracion.html',
  styleUrl: './pagina-eventos-administracion.scss'
})
export class PaginaEventosAdministracion implements OnInit {
  private readonly administradorServicio = inject(ServicioAdministrador);
  readonly eventos = signal<EventoAdministrativo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtrosExpandido = signal(false);
  readonly filtros = signal<Filtros>({
    etiqueta: '',
    marcador: '',
    texto: '',
    mostrarBusqueda: false,
    criterios: {}
  });
  readonly formularioFiltros = new FormGroup({
    descripcion: new FormControl(''),
    aliasUsuario: new FormControl(''),
    fechaTexto: new FormControl(''),
    id: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'ID', formato: 'texto' },
    { clave: 'fecha', titulo: 'Fecha', formato: 'fecha' },
    { clave: 'descripcion', titulo: 'Descripción', formato: 'texto' },
    { clave: 'aliasUsuario', titulo: 'Usuario', formato: 'texto' }
  ];

  ngOnInit(): void {
    this.cargar();
  }

  intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  buscar(): void {
    this.filtros.update((actual) => ({
      ...actual,
      texto: '',
      criterios: Object.fromEntries(
        Object.entries(this.formularioFiltros.getRawValue())
          .filter(([, valor]) => Boolean(valor?.trim()))
          .map(([clave, valor]) => [clave, valor!.trim()])
      )
    }));
  }

  reiniciarFiltros(): void {
    this.formularioFiltros.reset({ descripcion: '', aliasUsuario: '', fechaTexto: '', id: '' });
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios: {} }));
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.administradorServicio.obtenerListaEventos().subscribe({
      next: (respuesta) => {
        this.eventos.set(respuesta.datos.map((evento) => ({
          ...evento,
          fechaTexto: new Date(evento.fecha).toISOString().slice(0, 10)
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los eventos.');
        this.cargando.set(false);
      }
    });
  }
}
