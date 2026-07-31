import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { Panel } from '../../recursos/dialogo.base.panel';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablaComponent
  ],
  templateUrl: './panel-localizaciones.componente.html'
})
export class PanelLocalizaciones extends Panel {

  private servicioDispositivio = inject(ServicioDispositivo)

  public filtros = signal<Filtros>({
    etiqueta: 'Filtrar localizaciones',
    marcador: 'Filtrar por latitud, longitud y altitud.',
    texto: ''
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
  public datos = signal<any[]>([]);

  protected override iniciar(): void {
    this.servicioDispositivio.obtenerLocalizaciones(this.parametros).subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.datos);
      }
    })
  }

  public verLocalizacion(datos: any): void {
    if (datos.latitud == null || datos.longitud == null) {
      return;
    }
    const url = `https://www.google.com/maps?q=${datos.latitud},${datos.longitud}`;
    window.open(url, '_blank');
  }
}

