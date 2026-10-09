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
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

interface UsuarioAdministrativo {
  id: number;
  alias: string;
  direccionCorreoElectronico: string;
  telefono: string | null;
  estatus: boolean;
  estadoTexto: string;
}

@Component({
  selector: 'app-pagina-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatExpansionModule,
    ReactiveFormsModule,
    TablaComponent,
  ],
  templateUrl: './pagina-usuarios.html',
  styleUrl: './pagina-usuarios.scss'
})
export class PaginaUsuarios implements OnInit {
  private readonly administradorServicio = inject(ServicioAdministrador);
  readonly usuarios = signal<UsuarioAdministrativo[]>([]);
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
    alias: new FormControl(''),
    direccionCorreoElectronico: new FormControl(''),
    telefono: new FormControl(''),
    estadoTexto: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'ID', formato: 'texto' },
    { clave: 'alias', titulo: 'Alias', formato: 'texto' },
    { clave: 'direccionCorreoElectronico', titulo: 'Correo electrónico', formato: 'texto' },
    { clave: 'telefono', titulo: 'Teléfono', formato: 'texto' },
    { clave: 'estadoTexto', titulo: 'Estado', formato: 'texto' }
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
    this.formularioFiltros.reset({
      alias: '',
      direccionCorreoElectronico: '',
      telefono: '',
      estadoTexto: ''
    });
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios: {} }));
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.administradorServicio.obtenerListaUsuarios().subscribe({
      next: (respuesta) => {
        this.usuarios.set(respuesta.datos.map((usuario) => ({
          ...usuario,
          estadoTexto: usuario.estatus ? 'Activo' : 'Inactivo'
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los usuarios.');
        this.cargando.set(false);
      }
    });
  }
}
