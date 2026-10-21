import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServicioSolicitud } from '../../servicios/servicio-solicitud';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

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
    TablaComponent,
    MatDatepickerModule,
    MatSelectModule
  ],
  templateUrl: './pagina-solicitudes.html'
})
export class PaginaSolicitudes {
  private readonly servicioAdministrador = inject(ServicioAdministrador);

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
    estatus: new FormControl(''),
    descripcion: new FormControl('')
  });

  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'Id', formato: 'texto' },
    { clave: 'fecha', titulo: 'Fecha', formato: 'fecha' },
    { clave: 'medioContacto', titulo: 'Medio de contacto', formato: 'texto' },
    { clave: 'descripcion', titulo: 'Decripcion', formato: 'texto' },
    { clave: 'estatusTexto', titulo: 'Estatus', formato: 'texto', },
    { clave: 'fechaResolucion', titulo: 'Fecha de resolución', formato: 'texto', },
  ];

  public ngOnInit(): void {
    this.cargar()
  }

  public cargar(): void {
    const filtros = this.formularioFiltros.getRawValue()

    this.servicioAdministrador.obtenerListaSolicitudes(filtros).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.datos)
      }
    });
  }

  public intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  public reiniciarFiltros(): void {
    this.formularioFiltros.reset();
  }

}
