import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { Dispositivo, Localizacion } from '../../interfaces/dispositivo';
import { Socket } from '../../recursos/socket';
import type * as Leaflet from 'leaflet';

interface ElementoLocalizacion {
  clave: string;
  alias: string;
  tipoTexto: string;
  localizacion: Localizacion | null;
  estatusConexion: boolean | null | -1;
  color: string;
  esYo: boolean;
}

const CLAVE_YO = '__ubicacion_propia__';

@Component({
  selector: 'app-pagina-localizaciones',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './pagina-localizaciones.html',
  styleUrl: './pagina-localizaciones.scss'
})
export class PaginaLocalizaciones implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapa', { static: true })
  private readonly elementoMapa!: ElementRef<HTMLDivElement>;

  readonly menuAbierto = signal(true);
  readonly errorUbicacion = signal(false);
  readonly actualizandoPosicion = signal(false);
  readonly dispositivos = signal<Dispositivo[]>([]);
  readonly ubicacionPropia = signal<Localizacion | null>(null);
  readonly seleccionados = signal(new Set<string>([CLAVE_YO]));
  readonly ahora = signal(Date.now());
  readonly elementos = computed<ElementoLocalizacion[]>(() => [
    {
      clave: CLAVE_YO,
      alias: 'Yo',
      tipoTexto: 'Ubicación actual',
      localizacion: this.ubicacionPropia(),
      estatusConexion: -1,
      color: '#238636',
      esYo: true
    },
    ...this.dispositivos().map((dispositivo, indice) => ({
      clave: dispositivo.clave,
      alias: dispositivo.alias || 'Sin alias',
      tipoTexto: dispositivo.tipoTexto || dispositivo.tipo || 'Dispositivo',
      localizacion: dispositivo.localizacion,
      estatusConexion: dispositivo.estatusConexion,
      color: this.colorDispositivo(indice),
      esYo: false
    }))
  ]);

  private mapa?: Leaflet.Map;
  private leaflet?: typeof import('leaflet');
  private capaMarcadores?: Leaflet.LayerGroup;
  private readonly socket = inject(Socket);
  private readonly suscripciones = new Subscription();
  private componenteDestruido = false;
  private marcadoresInicialesDibujados = false;
  private temporizadorAhora?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.suscripciones.add(
      this.socket.dispositivos$.subscribe(dispositivos => {
        if (Array.isArray(dispositivos)) {
          this.reemplazarDispositivos(dispositivos as Dispositivo[]);
        }
      })
    );

    this.suscripciones.add(
      this.socket.dispositivo$.subscribe(dispositivo => {
        if (dispositivo && !Array.isArray(dispositivo) && dispositivo.clave) {
          this.actualizarDispositivo(dispositivo as Dispositivo);
        }
      })
    );

    this.temporizadorAhora = setInterval(() => this.ahora.set(Date.now()), 60_000);
  }

  async ngAfterViewInit(): Promise<void> {
    const leaflet = await import('leaflet');
    if (this.componenteDestruido) {
      return;
    }

    this.leaflet = leaflet;
    this.mapa = leaflet.map(this.elementoMapa.nativeElement).setView([19.4326, -99.1332], 5);

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.mapa);

    this.capaMarcadores = leaflet.layerGroup().addTo(this.mapa);
    if (this.dispositivos().length > 0) {
      this.redibujarMarcadores();
      this.marcadoresInicialesDibujados = true;
    }
    this.recargarPosicion();
  }

  ngOnDestroy(): void {
    this.componenteDestruido = true;
    this.suscripciones.unsubscribe();
    if (this.temporizadorAhora) {
      clearInterval(this.temporizadorAhora);
    }
    this.mapa?.remove();
  }

  recargarPosicion(): void {
    this.errorUbicacion.set(false);
    this.actualizandoPosicion.set(true);

    if (!navigator.geolocation) {
      this.errorUbicacion.set(true);
      this.actualizandoPosicion.set(false);
      this.redibujarMarcadores();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.ubicacionPropia.set({
          latitud: coords.latitude,
          longitud: coords.longitude,
          altitud: coords.altitude ?? 0
        });
        this.actualizandoPosicion.set(false);
        this.redibujarMarcadores(true);
      },
      () => {
        this.errorUbicacion.set(true);
        this.actualizandoPosicion.set(false);
        this.redibujarMarcadores();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  alternarSeleccion(clave: string, seleccionado: boolean): void {
    this.seleccionados.update(actuales => {
      const siguiente = new Set(actuales);
      if (seleccionado) {
        siguiente.add(clave);
      } else {
        siguiente.delete(clave);
      }
      return siguiente;
    });
  }

  estaSeleccionado(clave: string): boolean {
    return this.seleccionados().has(clave);
  }

  claseConexion(estatus: boolean | null | -1): string {
    if (estatus === -1) return 'conexion-gris';
    if (estatus === true) return 'conexion-verde';
    if (estatus === false) return 'conexion-roja';
    return 'conexion-amarilla';
  }

  textoConexion(estatus: boolean | null | -1): string {
    if (estatus === -1) return 'Ubicación propia';
    if (estatus === true) return 'Conectado';
    if (estatus === false) return 'Desconectado';
    return 'Estado desconocido';
  }

  textoLocalizacion(elemento: ElementoLocalizacion): string {
    if (!elemento.localizacion) return 'Sin localización';
    if (elemento.esYo) return 'Posición actual';
    if (elemento.estatusConexion === true) return 'En línea';

    const fecha = elemento.localizacion.fecha;
    return fecha ? this.tiempoTranscurrido(fecha) : 'Última ubicación conocida';
  }

  private reemplazarDispositivos(dispositivos: Dispositivo[]): void {
    const anteriores = new Set(this.dispositivos().map(dispositivo => dispositivo.clave));
    const localizables = dispositivos.filter(dispositivo =>
      dispositivo.cualidades?.split(',').map(cualidad => cualidad.trim()).includes('LOC')
    );
    const clavesActuales = new Set(localizables.map(dispositivo => dispositivo.clave));

    this.dispositivos.set(localizables);
    this.seleccionados.update(actuales => {
      const siguientes = new Set([...actuales].filter(clave => clave === CLAVE_YO || clavesActuales.has(clave)));
      for (const dispositivo of localizables) {
        if (!anteriores.has(dispositivo.clave)) siguientes.add(dispositivo.clave);
      }
      siguientes.add(CLAVE_YO);
      return siguientes;
    });

    if (!this.marcadoresInicialesDibujados && this.mapa && localizables.length > 0) {
      this.redibujarMarcadores();
      this.marcadoresInicialesDibujados = true;
    }
  }

  private actualizarDispositivo(dispositivo: Dispositivo): void {
    const dispositivos = this.dispositivos();
    const indice = dispositivos.findIndex(actual => actual.clave === dispositivo.clave);

    if (indice === -1) {
      if (dispositivo.cualidades?.split(',').map(cualidad => cualidad.trim()).includes('LOC')) {
        this.reemplazarDispositivos([...dispositivos, dispositivo]);
      }
      return;
    }

    const actualizados = [...dispositivos];
    actualizados[indice] = { ...actualizados[indice], ...dispositivo };
    this.reemplazarDispositivos(actualizados);
  }

  private colorDispositivo(indice: number): string {
    const tono = (indice * 137.508 + 18) % 360;
    return `hsl(${tono} 70% 38%)`;
  }

  private tiempoTranscurrido(fecha: string): string {
    const instante = new Date(fecha.replace(' ', 'T')).getTime();
    if (!Number.isFinite(instante)) return 'Última ubicación conocida';

    const segundos = Math.max(0, Math.floor((this.ahora() - instante) / 1000));
    if (segundos < 60) return 'Hace menos de un minuto';

    const unidades: [number, Intl.RelativeTimeFormatUnit][] = [
      [60 * 60 * 24 * 365, 'year'],
      [60 * 60 * 24 * 30, 'month'],
      [60 * 60 * 24, 'day'],
      [60 * 60, 'hour'],
      [60, 'minute']
    ];
    const [duracion, unidad] = unidades.find(([duracionUnidad]) => segundos >= duracionUnidad)!;
    const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'always' })
      .format(-Math.floor(segundos / duracion), unidad);
    return relativo.charAt(0).toUpperCase() + relativo.slice(1);
  }

  private redibujarMarcadores(recentrarEnYo = false): void {
    if (!this.mapa || !this.leaflet || !this.capaMarcadores) return;

    this.capaMarcadores.clearLayers();
    const seleccionados = this.seleccionados();
    const miUbicacion = this.ubicacionPropia();

    if (miUbicacion && seleccionados.has(CLAVE_YO)) {
      this.agregarMarcador(miUbicacion, 'Yo', '#238636');
      if (recentrarEnYo) this.mapa.setView([miUbicacion.latitud, miUbicacion.longitud], 16);
    }

    for (const dispositivo of this.dispositivos()) {
      const ubicacion = dispositivo.localizacion;
      if (!seleccionados.has(dispositivo.clave) || !ubicacion) continue;
      if (!Number.isFinite(ubicacion.latitud) || !Number.isFinite(ubicacion.longitud)) continue;

      const indice = this.dispositivos().findIndex(actual => actual.clave === dispositivo.clave);
      this.agregarMarcador(ubicacion, dispositivo.alias || 'Sin alias', this.colorDispositivo(indice));
    }
  }

  private agregarMarcador(ubicacion: Localizacion, etiqueta: string, color: string): void {
    this.leaflet?.circleMarker([ubicacion.latitud, ubicacion.longitud], {
      radius: 9,
      color: '#fff',
      weight: 3,
      fillColor: color,
      fillOpacity: 1
    }).bindTooltip(etiqueta, {
      permanent: true,
      direction: 'top',
      className: 'etiqueta-marcador',
      offset: [0, -8]
    }).addTo(this.capaMarcadores!);
  }

  alternarMenu(): void {
    this.menuAbierto.update(abierto => !abierto);
  }
}
