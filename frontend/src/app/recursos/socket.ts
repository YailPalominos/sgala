import { inject, Injectable } from '@angular/core';
import { io, Socket as sockerCliente } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Autenticador } from './autenticador';
import { Notificador } from './notificador';
import { Cargador } from './cargador';

@Injectable({ providedIn: 'root' })
export class Socket {
  private socketCliente: sockerCliente | null = null;
  private socketUrl = environment.socketUrl;
  private autenticador = inject(Autenticador);
  private notificador = inject(Notificador);
  private cargador = inject(Cargador);
  private desconectadoManual = false;
  private sesionInvalida = false;
  // agrgar notificaicone
  private dispositivosSubject = new BehaviorSubject<any[]>([]);
  public dispositivos$ = this.dispositivosSubject.asObservable();

  private dispositivoSubject = new BehaviorSubject<any>([]);
  public dispositivo$ = this.dispositivoSubject.asObservable();

  private notificacionesSubject = new BehaviorSubject<any>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  private errorDispositivoSubject = new BehaviorSubject<any>(null);
  public errorDispositivo$ = this.errorDispositivoSubject.asObservable();

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

    this.desconectadoManual = false;
    this.sesionInvalida = false;

    this.socketCliente = io(this.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],

      // Reconexión automática: seguir intentando indefinidamente
      // mientras no haya conexión.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,

      auth: {
        claveSesion: sesion.clave
      }
    });

    this.socketCliente.on('connect', () => {
      console.log('🟢 Socket conectado');
      console.log('Id Socket:', this.socketCliente?.id);
      // Hay conexión: ocultar el spinner de carga.
      this.cargador.ocultar();
    });

    this.socketCliente.on(
      'dispositivos',
      (dispositivos) => {
        console.log('📟 Dispositivos ');
        const normalizados = dispositivos.map((dispositivo: any) =>
          this.convertirNullStrings(dispositivo)
        );
        this.dispositivosSubject.next(normalizados);
      }
    );

    this.socketCliente.on(
      'dispositivo',
      (dipositivo) => {
        console.log('💻 Dispositivo ');
        dipositivo = this.convertirNullStrings(dipositivo)
        this.dispositivoSubject.next(dipositivo);
      }
    );

    this.socketCliente.on(
      'notificaciones',
      (notificaciones) => {
        console.log('🔔 Notificaciones ');
        const normalizados = notificaciones.map((notificacion: any) =>
          this.convertirNullStrings(notificacion)
        );
        this.notificacionesSubject.next(normalizados);
      }
    );

    this.socketCliente.on('disconnect', (motivo) => {
      console.log('🔴 Socket desconectado:', motivo);
      // Si no fue una desconexión manual ni por sesión inválida,
      // se perdió la conexión: mostrar el spinner hasta reconectar.
      if (!this.desconectadoManual && !this.sesionInvalida) {
        this.cargador.mostrar('Sin conexión con SGALA');
      }
    });

    this.socketCliente.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket:', error.message);

      // Sesión inválida/expirada: no reintentar, cerrar sesión y
      // enviar al usuario al login avisándole.
      if (error.message === 'No autorizado') {
        this.sesionInvalida = true;
        this.desconectadoManual = true;
        this.socketCliente?.disconnect();
        this.socketCliente = null;
        this.cargador.ocultar();
        this.notificador.error(
          'Tu sesión no es válida o expiró. Inicia sesión nuevamente.'
        );
        this.autenticador.eliminarSesion();
        return;
      }

      // No se logró (re)conectar: mantener el spinner activo.
      if (!this.desconectadoManual) {
        this.cargador.mostrar('Sin conexión con SGALA');
      }
    });

    this.socketCliente.on('error/dispositivo', (datos: any) => {
      this.notificador.error(datos?.mensaje || 'Error en la solicitud al dispositivo.');
      this.errorDispositivoSubject.next(datos);
    });

  }

  desconectar(): void {

    if (!this.socketCliente) {
      console.log('🟡 Socket no existe');
      return;
    }

    console.log('🔌 Desconectando socket:', this.socketCliente.id);

    // Marcar como desconexión manual para no mostrar el spinner.
    this.desconectadoManual = true;

    this.socketCliente.disconnect();

    console.log('🔴 Socket desconectado');

    this.socketCliente = null;

    // Asegurar que el spinner quede oculto al cerrar sesión.
    this.cargador.ocultar();
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
