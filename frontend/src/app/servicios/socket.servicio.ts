import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { EventoLocalizacion, EventoEstadoConexion } from '../interfaces/socket-eventos.interface';

@Injectable({ providedIn: 'root' })
export class SocketServicio {
  private socket: Socket | null = null;
  private socketUrl = environment.socketUrl;

  conectar(): void {
    if (this.socket?.connected) return;
    this.socket = io(this.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }

  onLocalizacionActualizada(callback: (evento: EventoLocalizacion) => void): void {
    this.socket?.on('localizacion:actualizada', callback);
  }

  onEstadoActualizado(callback: (evento: EventoEstadoConexion) => void): void {
    this.socket?.on('dispositivo:estado', callback);
  }

  desconectar(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
