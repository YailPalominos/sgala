import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatIconModule } from '@angular/material/icon';
import { ServicioAgente } from '../../servicios/servicio-agente';
import { Subject, takeUntil } from 'rxjs';


interface MensajeChat {
  fecha: string;
  usuario: 'A' | 'U';
  contenido: string;
  tipo: 'L' | 'O';// Libre opcion
  opciones: any
}



@Component({
  selector: 'app-agente-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './dialogo-agente.html',
  styleUrl: './dialogo-agente.scss',
})
export class DialogoAgente extends Dialogo {

  servicioAgente = inject(ServicioAgente);

  private destruir$ = new Subject<void>();

  mensajes: MensajeChat[] = [];
  mensaje: string = ''

  override cargar(): void {
    this.servicioAgente
      .obtenerRespuestas()
      .pipe(
        takeUntil(this.destruir$)
      )
      .subscribe((respuesta: any) => {
        this.mensajes.push(respuesta);
      });
  }


  seleccionarOpcion(clave: string) {
    this.servicioAgente.enviarMensaje(clave);

    this.mensajes.push({
      fecha: new Date().toLocaleString('sv-SE'),
      usuario: 'U',
      contenido: clave,
      tipo: 'L',
      opciones: undefined
    });
  }

  enviarMensaje(): void {

    const texto = this.mensaje?.trim();

    if (!texto) {
      return;
    }

    this.mensajes.push({
      fecha: new Date().toLocaleString('sv-SE'),
      usuario: 'U',
      contenido: texto,
      tipo: 'L',
      opciones: undefined
    });

    this.servicioAgente.enviarMensaje(texto);

    this.mensaje = '';

  }


  // ngOnDestroy(): void {
  //   this.destruir$.next();
  //   this.destruir$.complete();
  //   this.servicioAgente.desconectar();
  // }

}
