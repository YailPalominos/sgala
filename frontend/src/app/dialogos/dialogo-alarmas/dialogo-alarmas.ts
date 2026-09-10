import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Dialogo } from '../../recursos/dialogo.base';
import { Socket } from '../../recursos/socket';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { DialogoConfirmacion } from '../dialogo-confirmacion/dialogo-confirmacion';
import { Alarma } from '../../interfaces/dispositivo';
import dayjs from 'dayjs';

@Component({
  selector: 'app-dialogo-alarmas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './dialogo-alarmas.html',
  styles: [`
    .contenedor-alarmas {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      max-height: 350px;
      overflow-y: auto;
    }

    .alarma-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      background: #fff3e0;
      border: 1px solid #ffe0b2;
    }

    .alarma-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .alarma-descripcion {
      font-size: 14px;
      color: #212121;
    }

    .alarma-clave {
      font-size: 11px;
      color: #9e9e9e;
      font-family: monospace;
      word-break: break-all;
    }

    .alarma-fecha {
      font-size: 12px;
      color: #757575;
    }

    .sin-alarmas {
      text-align: center;
      color: #9e9e9e;
      padding: 24px;
      font-size: 14px;
    }

    .acciones {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .titulo {
      text-align: center;
      margin: 0;
      padding: 12px;
      font-size: 16px;
      font-weight: 500;
    }
  `]
})
export class DialogoAlarmas extends Dialogo {

  private socket = inject(Socket);
  private dialogoServicio = inject(DialogoServicio);

  get alarmas(): Alarma[] {
    return this.datos?.alarmas ?? [];
  }

  get claveDispositivo(): string {
    return this.datos?.claveDispositivo;
  }

  public formatearFecha(fecha: Date | string): string {
    return dayjs(fecha).format('DD/MM/YYYY HH:mm:ss');
  }

  public desactivarAlarma(alarma: Alarma): void {
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Desactivar alarma',
        mensaje: `¿Desactivar esta alarma?\n\n${alarma.descripcion}\n${alarma.clave}`
      },
      datos: alarma,
      alFinalizar: this.finalizarDesactivar.bind(this)
    });
  }

  private finalizarDesactivar(respuesta: any): void {
    if (respuesta?.resultado !== true) {
      return;
    }

    const alarma = respuesta.datos as Alarma;

    this.socket.emitir('solicitud/alarma', {
      claveDispositivo: this.claveDispositivo,
      claveAlarma: alarma.clave,
      descripcion: alarma.descripcion
    });

    this.datos.alarmas = this.datos.alarmas.filter(
      (a: Alarma) => a.clave !== alarma.clave
    );
  }

  public cerrarPanel(): void {
    this.cerrar();
  }
}
