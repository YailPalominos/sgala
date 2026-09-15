import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

interface OpcionChat {
  clave: string;
  contenido: string;
}

export interface RespuestaAsistente {
  tipo: string;
  fecha: string;
  usuario: 'A' | 'U';
  contenido: string;
  opciones?: OpcionChat[];
}

@Injectable({
  providedIn: 'root'
})
export class ServicioAsistente {

  private socket: Socket;

  private respuestaSubject = new Subject<RespuestaAsistente>();

  constructor() {

    this.socket = io('http://localhost:4700', {
      transports: ['websocket'],
      autoConnect: true
    });


    this.socket.on('connect', () => {
      console.log(
        '🔌 Conectado al asistente:',
        this.socket.id
      );
    });


    this.socket.on('disconnect', () => {
      console.log(
        '🔌 Desconectado del asistente'
      );
    });


    this.socket.on(
      'respuesta',
      (data: RespuestaAsistente) => {
        this.respuestaSubject.next(data);
      }
    );

  }

  obtenerRespuestas(): Observable<RespuestaAsistente> {
    return this.respuestaSubject.asObservable();
  }

  private esperarConexion(): Promise<void> {
    if (this.socket.connected) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.socket.once('connect', () => {
        resolve();
      });
    });


  }

  async enviarMensaje(mensaje: string): Promise<void> {
    await this.esperarConexion();
    this.socket.emit('mensaje', {
      mensaje
    });
  }

  desconectar(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

}
