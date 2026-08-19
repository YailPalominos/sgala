import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Dispositivo } from '../../interfaces/dispositivo';
import { MatMenuModule } from '@angular/material/menu';
import { Socket } from '../../recursos/socket';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { FormularioDispositivo } from '../../formularios/formulario-dipositivo/formulario-dispositivo';
import { DialogoValidacion } from '../../dialogos/dilogo-validacion/dialogo-validacion';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoInformacion } from '../../dialogos/dialogo-informacion/dialogo-informacion';
import dayjs from 'dayjs';

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
  templateUrl: './pagina-principal.html',
  styleUrl: './pagina-principal.scss',
})
export class PaginaPrincipal implements OnInit {

  private socket = inject(Socket);
  private dialogoServicio = inject(DialogoServicio);

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


  ngOnInit(): void {

    this.socket.dispositivos$
      .subscribe(dispositivos => {
        this.dispositivos.set(dispositivos);
        this.cargando.set(false)
      });

    this.socket.dispositivo$
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

  public verRazonAlarma(dispositivo: Dispositivo) {
    if (dispositivo.alarmas == null) {
      return
    }
    const mensaje = dispositivo.alarmas
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((alarma, index) => {
        const fecha = dayjs(alarma.fecha).format('YYYY-MM-DD HH:mm:ss');

        return `${index + 1}) ${alarma.clave} - ${fecha} - ${alarma.descripcion}`;
      })
      .join('\n');

    this.dialogoServicio.abrir({
      referencia: DialogoInformacion,
      titulo: 'Información',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Razón de la alarma",
        mensaje: mensaje
      }
    });
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

  public intercalarCortaCorrientes(dispositivo: Dispositivo): void {
    const cortaCorrientesActivo = dispositivo.estatusCortaCorriente === true
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Corta corriente",
        mensaje: cortaCorrientesActivo
          ? '¿Desea desactivar el corta corrientes del dispositivo?'
          : '¿Desea activar el corta corrientes del dispositivo?',
      },
      datos: {
        clave: dispositivo.clave,
        estatusCortaCorriente: cortaCorrientesActivo ? false : true
      },
      alFinalizar: this.finalizarIntercalarCortaCorrientes,
      clase: this.constructor.name
    });
  }

  private finalizarIntercalarCortaCorrientes(respuesta?: any) {
    if (respuesta?.resultado == true) {
      this.socket.emitir(
        'solicitud/dispositivo',
        {
          clave: respuesta.datos.clave,
          estatusCortaCorriente: respuesta.datos.estatusCortaCorriente
        }
      );
    }
  }

  public intercalarAlarma(dispositivo: Dispositivo): void {
    const alarmaActiva = dispositivo.estatusAlarma === true
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Alarma",
        mensaje: alarmaActiva
          ? '¿Desea desactivar la alarma del dispositivo?'
          : '¿Desea activar la alarma del dispositivo?'
      },
      datos: {
        clave: dispositivo.clave,
        estatusAlarma: alarmaActiva ? false : true
      },
      alFinalizar: this.finalizarIntercalarAlarma,
      clase: this.constructor.name
    });
  }

  private finalizarIntercalarAlarma(respuesta?: any) {
    if (respuesta?.resultado == true) {
      this.socket.emitir(
        'solicitud/dispositivo',
        {
          clave: respuesta.datos.clave,
          estatusAlarma: respuesta.datos.estatusAlarma
        }
      );
    }
  }

  public intercalarFijarEstacionado(dispositivo: Dispositivo): void {
    const estatusFijarEstacionado = dispositivo.estatusFijarEstacionado === true
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Fijar estacionado",
        mensaje: estatusFijarEstacionado
          ? '¿Desea desactivar la alarma de estacionamiento? El dispositivo dejará de generar alertas cuando detecte que fue movido.'
          : '¿Desea activar la alarma de estacionamiento? El dispositivo generará una alerta si detecta que el vehículo se mueve de su ubicación actual.'
      },
      datos: {
        clave: dispositivo.clave,
        estatusFijarEstacionado: estatusFijarEstacionado ? false : true
      },
      alFinalizar: this.finalizarIntercalarFijarEstacionado,
      clase: this.constructor.name
    });

  }

  private finalizarIntercalarFijarEstacionado(respuesta?: any) {
    if (respuesta?.resultado == true) {
      this.socket.emitir(
        'solicitud/dispositivo',
        {
          clave: respuesta.datos.clave,
          estatusFijarEstacionado: respuesta.datos.estatusFijarEstacionado
        }
      );
    }
  }

  public editarDispositivo(dispositivo: Dispositivo): void {
    this.dialogoServicio.abrir({
      referencia: FormularioDispositivo,
      titulo: 'Dispositivo',
      icono: 'view_carousel',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: 'A',
      datos: dispositivo
    });
  }

  public filtrar(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.textoBusqueda.set(texto);
  }

  public agregarDispositivo(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoValidacion,
      titulo: 'Validar',
      icono: 'check_circle',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: 'D',//'D' Dipsitivo
      alFinalizar: this.finalizarAgregarDispositivo,
      clase: this.constructor.name
    });

  }

  public finalizarAgregarDispositivo(resultado?: string) {
    if (resultado != undefined) {
      this.dialogoServicio.abrir({
        referencia: FormularioDispositivo,
        titulo: 'Dispositivo',
        icono: 'view_carousel',
        ancho: '450px',
        desactivarAutocerrado: true,
        parametros: 'A',
        datos: { clave: resultado }
      });
    }
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

  public textoEstado(estado?: string | null): string {

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

  public colorEstado(estado: string | null): string {

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

  public colorBateria(porcentaje: number | null): string {

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
