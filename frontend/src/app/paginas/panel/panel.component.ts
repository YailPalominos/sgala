import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DispositivoServicio } from '../../servicios/dispositivo.servicio';
import { SocketServicio } from '../../servicios/socket.servicio';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { Dispositivo } from '../../interfaces/dispositivo.interface';
import { EventoLocalizacion, EventoEstadoConexion } from '../../interfaces/socket-eventos.interface';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
})
export class PanelComponent implements OnInit, OnDestroy {
  private deviceService = inject(DispositivoServicio);
  private socketService = inject(SocketServicio);
  private authService = inject(AutenticacionServicio);
  private router = inject(Router);

  dispositivos = signal<Dispositivo[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarDispositivos();
  }

  cargarDispositivos(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.deviceService.obtenerDispositivos().subscribe({
      next: (dispositivos) => {
        this.dispositivos.set(dispositivos);
        this.cargando.set(false);
        this.socketService.conectar();
        this.socketService.onLocalizacionActualizada(this.actualizarLocalizacion.bind(this));
        this.socketService.onEstadoActualizado(this.actualizarEstado.bind(this));
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.status === 0) {
          this.error.set('No se pudieron cargar los dispositivos. Verifique su conexión.');
        }
        // 401 manejado por el interceptor → redirige a login
      },
    });
  }

  actualizarLocalizacion(evento: EventoLocalizacion): void {
    this.dispositivos.update((lista) =>
      lista.map((d) =>
        d.id === evento.dispositivoId
          ? { ...d, localizacion: { latitud: evento.latitud, longitud: evento.longitud, altitud: evento.altitud } }
          : d
      )
    );
  }

  actualizarEstado(evento: EventoEstadoConexion): void {
    this.dispositivos.update((lista) =>
      lista.map((d) =>
        d.id === evento.dispositivoId
          ? { ...d, estadoConexion: evento.estadoConexion }
          : d
      )
    );
  }

  obtenerEnlaceMaps(d: Dispositivo): string {
    return `https://www.google.com/maps?q=${d.localizacion!.latitud},${d.localizacion!.longitud}`;
  }

  cerrarSesion(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.socketService.desconectar();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        if (err.status === 401) {
          this.socketService.desconectar();
          this.router.navigate(['/login']);
        } else {
          this.error.set('No se pudo cerrar la sesión. Intente nuevamente.');
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.socketService.desconectar();
  }
}
