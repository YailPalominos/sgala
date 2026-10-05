import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { NavegacionAdministracion } from '../../componentes/navegacion-administracion/navegacion-administracion';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { FormularioPreDispositivo } from '../../formularios/formulario-pre-dispositivo/formulario-pre-dispositivo';

interface DispositivoAdministrativo {
  id: number;
  clave: string;
  estatus: boolean;
  cualidades: string | null;
  idDispositivo: number | null;
  aliasDispositivo: string | null;
  telefono: string | null;
  tipo: string;
  tipoTexto: string;
  idUsuario: number | null;
  aliasUsuario: string | null;
  correoUsuario: string | null;
  fechaFinalSuscripcion: string | null;
  estatusTexto: string;
  asignacionTexto: string;
  usuarioTexto: string;
}

@Component({
  selector: 'app-pagina-dispositivos',
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
  templateUrl: './pagina-dispositivos.html',
  styleUrl: './pagina-dispositivos.scss'
})
export class PaginaDispositivos implements OnInit {
  private readonly administradorServicio = inject(ServicioAdministrador);
  private readonly dialogoServicio = inject(DialogoServicio);

  readonly dispositivos = signal<DispositivoAdministrativo[]>([]);
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
    clave: new FormControl(''),
    tipoTexto: new FormControl(''),
    usuarioTexto: new FormControl(''),
    asignacionTexto: new FormControl(''),
    estatusTexto: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'clave', titulo: 'Clave', formato: 'texto' },
    { clave: 'tipoTexto', titulo: 'Tipo', formato: 'texto' },
    { clave: 'cualidades', titulo: 'Cualidades', formato: 'texto' },
    { clave: 'estatusTexto', titulo: 'Estado', formato: 'texto' },
    { clave: 'asignacionTexto', titulo: 'Asignación', formato: 'texto' },
    { clave: 'aliasDispositivo', titulo: 'Alias del dispositivo', formato: 'texto' },
    { clave: 'telefono', titulo: 'Teléfono', formato: 'texto' },
    { clave: 'usuarioTexto', titulo: 'Usuario', formato: 'texto' },
    { clave: 'fechaFinalSuscripcion', titulo: 'Fin de suscripción', formato: 'fecha' }
  ];

  ngOnInit(): void {
    this.cargarDispositivos();
  }

  abrirCrear(): void {
    this.dialogoServicio.abrir({
      referencia: FormularioPreDispositivo,
      titulo: 'Crear pre-dispositivo',
      icono: 'devices',
      largo: 'l35%,m55%,c100%',
      desactivarAutocerrado: true,
      alFinalizar: this.alCrearPreDispositivo.bind(this)
    });
  }

  alCrearPreDispositivo(respuesta: any): void {
    if (respuesta?.resultado === true) this.cargarDispositivos();
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
      clave: '',
      tipoTexto: '',
      usuarioTexto: '',
      asignacionTexto: '',
      estatusTexto: ''
    });
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios: {} }));
  }

  intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  cargarDispositivos(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.administradorServicio.obtenerListaDispositivos().subscribe({
      next: (respuesta) => {
        this.dispositivos.set(respuesta.datos.map((dispositivo) => ({
          ...dispositivo,
          estatusTexto: dispositivo.estatus ? 'Activo' : 'Inactivo',
          asignacionTexto: dispositivo.idDispositivo ? 'Asignado' : 'Disponible',
          usuarioTexto: dispositivo.idUsuario
            ? `${dispositivo.aliasUsuario ?? ''} ${dispositivo.correoUsuario ?? ''}`.trim()
            : '—'
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los pre-dispositivos. Intenta nuevamente.');
        this.cargando.set(false);
      }
    });
  }
}
