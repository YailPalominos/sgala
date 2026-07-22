import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SocketServicio } from '../../servicios/socket.servicio';
import { Dispositivo } from '../../interfaces/dispositivo.interface';
import { EventoLocalizacion, EventoEstadoConexion } from '../../interfaces/socket-eventos.interface';
import { DialogoDispositivo } from '../../dialogos/dialogo-dispositivo/dialogo-dispositivo';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { DialogoValidarClave } from '../../dialogos/validar-clave/validar-clave.dialogo';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { PanelSuscripciones } from '../panel-suscripciones/panel-suscripciones.componente';
import { PanelLocalizaciones } from '../panel-localizaciones/panel-localizaciones.componente';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule
  ],
  templateUrl: './panel-principal.componente.html',
  styleUrl: './panel-principal.componente.scss',
})
export class PanelPrincipalComponent implements OnInit {

  private socketService = inject(SocketServicio);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  private notificador = inject(NotificadorServicio);

  textoBusqueda = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);//'ENB', 'SBL'

  dispositivos = signal<Dispositivo[]>([]);
  dispositivosFiltrados = computed(() => {
    const texto = this.textoBusqueda().toLowerCase();
    if (!texto) return this.dispositivos();
    return this.dispositivos().filter(d =>
      d.telefono?.toLowerCase().includes(texto) ||
      d.clave?.toLowerCase().includes(texto) ||
      d.alias?.toLowerCase().includes(texto)
    );
  });

  private suscripcion?: Subscription;

  ngOnInit(): void {
    this.suscripcion =
      this.socketService.dispositivos$
        .subscribe(dispositivos => {
          this.dispositivos.set(dispositivos);
          this.cargando.set(false)
        });

    this.socketService.dispositivo$
      .subscribe(dispositivo => {

        this.dispositivos.update(lista => {

          const indice = lista.findIndex(
            d => d.clave === dispositivo.clave
          );

          if (indice === -1) {
            return lista;
          }

          lista[indice] = {
            ...lista[indice],
            ...dispositivo
          };

          return [...lista];
        });
      });
  }


  actualizarLocalizacion(evento: EventoLocalizacion): void {
    // this.dispositivos.update((lista) =>
    //   lista.map((d) =>
    //     d.id === evento.dispositivoId
    //       ? { ...d, localizacion: { latitud: evento.latitud, longitud: evento.longitud, altitud: evento.altitud } }
    //       : d
    //   )
    // );
  }

  actualizarEstado(evento: EventoEstadoConexion): void {
    // this.dispositivos.update((lista) =>
    //   lista.map((d) =>
    //     d.id === evento.dispositivoId
    //       ? { ...d, estadoConexion: evento.estadoConexion }
    //       : d
    //   )
    // );
  }

  public tieneCualidad(dispositivo: Dispositivo, cualidad: string): boolean {
    return dispositivo.cualidades
      ?.split(',')
      .includes(cualidad) ?? false;
  }

  public verLocalizacion(d: Dispositivo): void {
    if (!d.localizacion) {
      return;
    }

    const enlace = `https://www.google.com/maps?q=${d.localizacion.latitud},${d.localizacion.longitud}`;

    window.open(enlace, '_blank', 'noopener,noreferrer');
  }

  toggleEncendido(dispositivo: Dispositivo): void {
    // this.dispositivos.update((lista) =>
    //   lista.map((d) =>
    //     d.id === dispositivo.id ? { ...d, estadoEncendido: !d.estadoEncendido } : d
    //   )
    // );
  }

  toggleAlarma(dispositivo: Dispositivo): void {
    // this.dispositivos.update((lista) =>
    //   lista.map((d) =>
    //     d.id === dispositivo.id ? { ...d, estadoAlarma: !d.estadoAlarma } : d
    //   )
    // );
  }

  editarDispositivo(dispositivo: Dispositivo): void {

    const dialogRef = this.dialog.open(DialogoDispositivo, {
      width: '450px',
      disableClose: true,
      data: {
        accion: 'A',
        datos: dispositivo
      }
    });

    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta === true) {

      }
    });
  }

  public filtrar(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.textoBusqueda.set(texto);
  }

  public agregarDispositivo(): void {
    const dialogoReferencia = this.dialog.open(DialogoValidarClave,
      {
        width: '420px',
        data: {
          tipo: 'D'
        }
      });
    dialogoReferencia.afterClosed().subscribe((resultado: any) => {

      if (resultado === undefined || resultado === '') {
        return;
      }

      // La clave está disponible
      if (typeof resultado === 'string') {

        const dialogRef = this.dialog.open(DialogoDispositivo, {
          width: '450px',
          disableClose: true,
          data: {
            accion: 'R',
            datos: {
              clave: resultado
            }
          }
        });

        dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
          if (respuesta === true) {

            setTimeout(() => {
              this.notificador.informacion(
                'El usuario fue creado exitosamente. Se envió un correo electrónico con la información de la cuenta, incluyendo el alias, teléfono y la contraseña provisional para iniciar sesión.'
              );
            }, 3000);

          }
        });

        return;
      }

      // La clave ya está siendo utilizada
      const dispositivo = resultado as {
        alias: string;
        telefono: string;
      };

      this.notificador.advertencia(
        `La clave ya está siendo usada por otro dispositivo.\n\n` +
        `Alias: ${dispositivo.alias}\n` +
        `Teléfono: ${dispositivo.telefono}\n`
      );
    });

  }

  public verSuscripciones(): void {
    this.dialog.open(PanelSuscripciones, {
      width: '850px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: 'auto',
      disableClose: true,
    });
  }

  public verHistorial(claveDispositivo: string): void {
    this.dialog.open(PanelLocalizaciones, {
      width: '850px',
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: 'auto',
      disableClose: true,
      data: claveDispositivo
    });
  }


  public obtenerTextoSuscripcion(fechaFinal: string | Date | null): string {

    if (
      !fechaFinal ||
      fechaFinal === 'null' ||
      isNaN(new Date(fechaFinal).getTime())
    ) {
      return '';
    }

    const hoy = new Date();
    const fin = new Date(fechaFinal);

    hoy.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    if (fin < hoy) {
      return `Venció hace ${this.formatearPeriodo(fin, hoy)}`;
    }

    if (fin.getTime() === hoy.getTime()) {
      return 'Vence hoy';
    }

    return `Queda ${this.formatearPeriodo(hoy, fin)}`;
  }

  public obtenerColorSuscripcion(fechaFinal: string | Date | null): string {

    if (!fechaFinal) {
      return '#9e9e9e'; // Gris
    }

    const hoy = new Date();
    const fin = new Date(fechaFinal);

    hoy.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    const diferenciaDias = Math.floor(
      (fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diferenciaDias < 0) {
      return '#f44336'; // Rojo
    }

    if (diferenciaDias <= 15) {
      return '#ffc107'; // Amarillo
    }

    return '#4caf50'; // Verde
  }

  private formatearPeriodo(inicio: Date, fin: Date): string {

    let años = fin.getFullYear() - inicio.getFullYear();
    let meses = fin.getMonth() - inicio.getMonth();
    let dias = fin.getDate() - inicio.getDate();

    if (dias < 0) {
      meses--;

      dias += new Date(
        fin.getFullYear(),
        fin.getMonth(),
        0
      ).getDate();
    }

    if (meses < 0) {
      años--;
      meses += 12;
    }

    const partes: string[] = [];

    if (años > 0) {
      partes.push(`${años} ${años === 1 ? 'año' : 'años'}`);
    }

    if (meses > 0) {
      partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
    }

    if (dias > 0) {
      partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
    }

    return partes.length ? partes.join(' y ') : '0 días';
  }

  public textoEstado(estado?: string): string {

    switch (estado) {

      case 'E':
        return 'Estacionada';

      case 'M':
        return 'En movimiento';

      case 'P':
        return 'Prendida';

      default:
        return '-';
    }
  }


  public colorEstado(estado?: string): string {

    switch (estado) {

      case 'E':
        return '#4CAF50'; // Verde

      case 'M':
        return '#2196F3'; // Azul

      case 'P':
        return '#FF9800'; // Naranja

      default:
        return '#757575'; // Gris
    }
  }


  public colorBateria(porcentaje?: number): string {

    if (porcentaje == null) {
      return '#757575';
    }

    if (porcentaje >= 70) {
      return '#00C853'; // Verde
    }

    if (porcentaje >= 40) {
      return '#FFC107'; // Amarillo
    }

    if (porcentaje >= 20) {
      return '#FF9800'; // Naranja
    }

    return '#F44336'; // Rojo
  }

}
