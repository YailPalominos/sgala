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
import { NavegacionAdministracion } from '../../componentes/navegacion-administracion/navegacion-administracion';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

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
    NavegacionAdministracion,
    TablaComponent
  ],
  templateUrl: './pagina-eventos-administradores.html',
  styleUrl: './pagina-eventos-administradores.scss'
})
export class PaginaEventosAdministradores implements OnInit {
  private readonly servicio = inject(ServicioAdministrador);

  readonly eventos = signal<EventoAdministrador[]>([]);
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
    accion: new FormControl(''),
    aliasAdministrador: new FormControl(''),
    correoAdministrador: new FormControl(''),
    fechaTexto: new FormControl(''),
    id: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'ID', formato: 'texto' },
    { clave: 'fecha', titulo: 'Fecha', formato: 'fecha' },
    { clave: 'aliasAdministrador', titulo: 'Administrador', formato: 'texto' },
    { clave: 'correoAdministrador', titulo: 'Correo electrónico', formato: 'texto' },
    { clave: 'accion', titulo: 'Acción', formato: 'texto' }
  ];

  ngOnInit(): void {
    this.cargar();
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
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios }));
  }

  reiniciarFiltros(): void {
    this.formularioFiltros.reset({
      accion: '',
      aliasAdministrador: '',
      correoAdministrador: '',
      fechaTexto: '',
      id: ''
    });
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios: {} }));
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtenerListaEventosAdministradores().subscribe({
      next: (respuesta) => {
        this.eventos.set(respuesta.datos.map((evento) => ({
          ...evento,
          fechaTexto: new Date(evento.fecha).toISOString().slice(0, 10)
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los eventos de administradores.');
        this.cargando.set(false);
      }
    });
  }
}
