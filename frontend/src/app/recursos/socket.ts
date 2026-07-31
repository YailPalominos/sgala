import { inject, Injectable } from '@angular/core';
import { io, Socket as sockerCliente } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Autenticador } from './autenticador';

@Injectable({ providedIn: 'root' })
export class Socket {
  private socketCliente: sockerCliente | null = null;
  private socketUrl = environment.socketUrl;
  private autenticador = inject(Autenticador);

  private dispositivosSubject = new BehaviorSubject<any[]>([]);
  public dispositivos$ = this.dispositivosSubject.asObservable();

  private dispositivoSubject = new BehaviorSubject<any>([]);
  public dispositivo$ = this.dispositivoSubject.asObservable();

  conectar(): void {

    if (this.socketCliente?.connected) {
      console.log('🟢 Socket ya estaba conectado');
      return;
    }

    const sesion = this.autenticador.obtenerSesion();

    if (!sesion) {
      console.error('❌ No existe sesión para conectar socket');
      return;
    }

    this.socketCliente = io(this.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],

      auth: {
        claveSesion: sesion.clave
      }
    });

    this.socketCliente.on('connect', () => {
      console.log('🟢 Socket conectado');
      console.log('Id Socket:', this.socketCliente?.id);
    });

    this.socketCliente.on(
      'dispositivos',
      (dispositivos) => {
        console.log('📡 Dispositivos ');
        const normalizados = dispositivos.map((dispositivo: any) =>
          this.convertirNullStrings(dispositivo)
        );

        this.dispositivosSubject.next(normalizados);
      }
    );

    this.socketCliente.on(
      'dispositivo',
      (dipositivo) => {
        console.log('📡 Disposivo ');
        dipositivo = this.convertirNullStrings(dipositivo)
        this.dispositivoSubject.next(dipositivo);
      }
    );

    this.socketCliente.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });

    this.socketCliente.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket:', error.message);
    });

  }

  desconectar(): void {

    if (!this.socketCliente) {
      console.log('🟡 Socket no existe');
      return;
    }

    console.log('🔌 Desconectando socket:', this.socketCliente.id);

    this.socketCliente.disconnect();

    console.log('🔴 Socket desconectado');

    this.socketCliente = null;
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

  /**
 * Envía un evento al servidor Socket.io.
 * @param evento Nombre del evento.
 * @param datos Datos a enviar.
 */
  emitir<T = any>(
    evento: string,
    datos?: T
  ): void {

    if (!this.socketCliente?.connected) {
      console.error(
        '❌ Socket no conectado'
      );
      return;
    }

    this.socketCliente.emit(
      evento,
      datos
    );

  }
}
