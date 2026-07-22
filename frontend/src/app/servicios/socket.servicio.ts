import { inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { EventoLocalizacion, EventoEstadoConexion } from '../interfaces/socket-eventos.interface';
import { AutenticacionServicio } from './autenticacion.servicio';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketServicio {
  private socket: Socket | null = null;
  private socketUrl = environment.socketUrl;
  private autenticacionServicio = inject(AutenticacionServicio);

  private dispositivosSubject = new BehaviorSubject<any[]>([]);
  public dispositivos$ = this.dispositivosSubject.asObservable();

  private dispositivoSubject = new BehaviorSubject<any>([]);
  public dispositivo$ = this.dispositivoSubject.asObservable();

  conectar(): void {

    if (this.socket?.connected) {
      console.log('🟢 Socket ya estaba conectado');
      return;
    }

    const sesion = this.autenticacionServicio.obtenerSesion();

    if (!sesion) {
      console.error('❌ No existe sesión para conectar socket');
      return;
    }

    this.socket = io(this.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],

      auth: {
        claveSesion: sesion.clave
      }
    });

    this.socket.on('connect', () => {
      console.log('🟢 Socket conectado');
      console.log('Id Socket:', this.socket?.id);
      // this.socket?.emit('dispositivos');
    });

    this.socket.on(
      'dispositivos',
      (dispositivos) => {
        console.log('📡 Dispositivos ');
        const normalizados = dispositivos.map((dispositivo: any) =>
          this.convertirNullStrings(dispositivo)
        );

        this.dispositivosSubject.next(normalizados);
      }
    );

    this.socket.on(
      'dispositivo',
      (dipositivo) => {
        console.log('📡 Disposivo ');
        dipositivo = this.convertirNullStrings(dipositivo)
        this.dispositivoSubject.next(dipositivo);
      }
    );

    this.socket.on('disconnect', (motivo) => {
      console.log('🔴 Socket desconectado:', motivo);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket:', error.message);
    });

  }

  onLocalizacionActualizada(callback: (evento: EventoLocalizacion) => void): void {
    this.socket?.on('localizacion:actualizada', callback);
  }

  onEstadoActualizado(callback: (evento: EventoEstadoConexion) => void): void {
    this.socket?.on('dispositivo:estado', callback);
  }

  desconectar(): void {

    if (!this.socket) {
      console.log('🟡 Socket no existe');
      return;
    }

    console.log('🔌 Desconectando socket:', this.socket.id);

    this.socket.disconnect();

    console.log('🔴 Socket desconectado');

    this.socket = null;
  }

  private convertirNullStrings<T>(obj: T): T {

    if (Array.isArray(obj)) {
      return obj.map(x => this.convertirNullStrings(x)) as T;
    }

    if (obj && typeof obj === 'object') {

      for (const key of Object.keys(obj)) {

        const valor = (obj as any)[key];

        if (valor === 'null') {
          (obj as any)[key] = null;
        } else if (typeof valor === 'object') {
          (obj as any)[key] = this.convertirNullStrings(valor);
        }

      }

    }

    return obj;
  }
}
