import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServicioSolicitud } from '../../servicios/servicio-solicitud';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  selector: 'app-pagina-solicitudes',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatExpansionModule,
    MatTooltipModule,
    ReactiveFormsModule,
    TablaComponent
  ],
  templateUrl: './pagina-solicitudes.html'
})
export class PaginaSolicitudes {
  private readonly servicio = inject(ServicioSolicitud);

  datos = signal<any[]>([]);

  readonly filtrosExpandido = signal(false);
  readonly filtros = signal<Filtros>({
    etiqueta: '',
    marcador: '',
    texto: '',
    botones: [
      {
        icono: 'add',
        texto: 'Crear'
      }
    ]
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

    const filtros = this.formularioFiltros.getRawValue()

    this.servicio.obtenerLista(filtros).subscribe({
      next: (respuesta) => {
        this.datos = respuesta.datos
      }
    });
  }
}
