import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatIconModule } from '@angular/material/icon';
import { ServicioAsistente } from '../../servicios/servicio-asistente';
import { Subject, takeUntil } from 'rxjs';


interface MensajeChat {
  fecha: string;
  usuario: 'A' | 'U';
  contenido: string;
  tipo: 'L' | 'O';// Libre opcion
  opciones: any
}



@Component({
  selector: 'app-seleccion-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './dialogo-asistente.html',
  styleUrl: './dialogo-asistente.scss',
})
export class DialogoAsistente extends Dialogo {

  servicioAsistente = inject(ServicioAsistente);

  private destruir$ = new Subject<void>();

  mensajes: MensajeChat[] = [];
  mensaje: string = ''

  override cargar(): void {
    this.servicioAsistente
      .obtenerRespuestas()
      .pipe(
        takeUntil(this.destruir$)
      )
      .subscribe((respuesta: any) => {
        this.mensajes.push(respuesta);
      });
  }


  seleccionarOpcion(clave: string) {
    this.servicioAsistente.enviarMensaje(clave);

    this.mensajes.push({
      fecha: new Date().toLocaleString('sv-SE'),
      usuario: 'U',
      contenido: clave,
      tipo: 'L',
      opciones: undefined
    });
  }

  enviarMensaje(): void {

    if (!this.mensaje) {
      return;
    }

    this.mensajes.push({
      fecha: new Date().toLocaleString('sv-SE'),
      usuario: 'U',
      contenido: this.mensaje,
      tipo: 'L',
      opciones: undefined
    });

    this.servicioAsistente.enviarMensaje(this.mensaje);

  }


  // ngOnDestroy(): void {
  //   this.destruir$.next();
  //   this.destruir$.complete();
  //   this.servicioAsistente.desconectar();
  // }

}
