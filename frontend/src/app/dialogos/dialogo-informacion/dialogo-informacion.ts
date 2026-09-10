import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatIconModule } from '@angular/material/icon';


export interface ConfirmacionData {
  titulo?: string;
  mensaje?: string;
  textoSi?: string;
  textoNo?: string;
}

@Component({
  selector: 'app-informacion-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './dialogo-informacion.html',
  styles: [`
    .centrado {
      text-align: center;
        white-space: pre-line;
      justify-content: center;
    }

    mat-dialog-content {
      padding: 16px 24px;
      font-size: 15px;
    }

    mat-dialog-actions {
      gap: 12px;
      padding-bottom: 16px;
    }
  `]
})
export class DialogoInformacion extends Dialogo {
  public responder(respuesta: boolean): void {
    this.cerrar(respuesta)
  }

}