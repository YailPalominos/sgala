import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ServicioSuscripcion } from '../../servicios/servicio-suscripcion';

@Component({
  selector: 'app-pagina-suscripciones',
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
  ],
  templateUrl: './pagina-suscripciones.html'
})
export class PaginaSuscripciones {
  private readonly servicioSuscripcion = inject(ServicioSuscripcion);

  datos = signal<any[]>([]);

  readonly filtrosExpandido = signal(false);
  readonly filtros = signal<Filtros>({
    etiqueta: 'Buscar',
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
    fechaInicial: new FormControl(''),
    fechaFinal: new FormControl(''),
    horaInicial: new FormControl(''),
    horaFinal: new FormControl(''),
    descripcion: new FormControl(''),
    id: new FormControl('')
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'ID', formato: 'texto' },

  ];

  ngOnInit(): void {
    this.cargar();
  }

  intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  buscar(): void {

  }

  reiniciarFiltros(): void {
    this.formularioFiltros.reset()

  }

  cargar(): void {

    const filtros = this.formularioFiltros.getRawValue()

    // this.servicioSuscripcion.obtenerLista(filtros).subscribe({
    //   next: (respuesta) => {
    //     this.datos = respuesta.datos
    //   }
    // });
  }
}
