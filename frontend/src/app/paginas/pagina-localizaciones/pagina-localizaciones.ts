import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { Dispositivo, Localizacion } from '../../interfaces/dispositivo';
import { Socket } from '../../recursos/socket';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
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
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, ReactiveFormsModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './pagina-localizaciones.html',
  styleUrl: './pagina-localizaciones.scss'
})
export class PaginaLocalizaciones implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapa', { static: true })
  private readonly elementoMapa!: ElementRef<HTMLDivElement>;

  readonly menuAbierto = signal(true);
  readonly filtrosAbiertos = signal(false);
  readonly buscando = signal(false);
  readonly errorHistorial = signal('');
  readonly errorMapa = signal('');
  readonly errorUbicacion = signal(false);
  readonly actualizandoPosicion = signal(false);
  readonly dispositivos = signal<Dispositivo[]>([]);
  readonly ubicacionPropia = signal<Localizacion | null>(null);
  readonly seleccionados = signal(new Set<string>([CLAVE_YO]));
  readonly ahora = signal(Date.now());
  readonly filtros = new FormGroup({
    fechaInicial: new FormControl<Date | null>(null),
    fechaFinal: new FormControl<Date | null>(null),
    horaInicial: new FormControl('00:00'),
    horaFinal: new FormControl('23:59')
  });
  readonly historial = signal<Record<string, Localizacion[]>>({});
  readonly elementos = computed<ElementoLocalizacion[]>(() => [
    {
      clave: CLAVE_YO,
      alias: 'Yo',
      tipoTexto: 'Ubicación actual',
      localizacion: this.ubicacionPropia(),
      estatusConexion: -1,
      color: '#475569',
      esYo: true
    },
    ...(Array.isArray(this.dispositivos()) ? this.dispositivos() : []).map((dispositivo, indice) => ({
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
  private readonly servicioDispositivo = inject(ServicioDispositivo);
  private readonly suscripciones = new Subscription();
  private componenteDestruido = false;
  private marcadoresInicialesDibujados = false;
  private temporizadorAhora?: ReturnType<typeof setInterval>;
  private capaRutas?: Leaflet.LayerGroup;
  private observadorTamano?: ResizeObserver;

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
    try {
      const modulo = await import('leaflet');
      if (this.componenteDestruido) return;

      // Algunos empaquetados exponen Leaflet en `default`, otros como exports nombrados.
      const candidatos = [modulo, (modulo as any).default];
      const leaflet = candidatos.find(candidato => typeof candidato?.map === 'function') as typeof import('leaflet') | undefined;
      if (!leaflet) {
        throw new Error('El módulo de Leaflet no expone la función map().');
      }

      this.leaflet = leaflet;
      this.mapa = leaflet.map(this.elementoMapa.nativeElement).setView([19.4326, -99.1332], 5);

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.mapa);

      this.capaMarcadores = leaflet.layerGroup().addTo(this.mapa);
      this.capaRutas = leaflet.layerGroup().addTo(this.mapa);
      if (this.dispositivos().length > 0) {
        this.redibujarMarcadores();
        this.marcadoresInicialesDibujados = true;
      }

      this.observadorTamano = new ResizeObserver(() => {
        this.mapa?.invalidateSize({ pan: false, debounceMoveend: true });
      });
      this.observadorTamano.observe(this.elementoMapa.nativeElement);
      requestAnimationFrame(() => this.mapa?.invalidateSize({ pan: false }));
      setTimeout(() => {
        if (!this.componenteDestruido) this.mapa?.invalidateSize({ pan: false });
      }, 150);
      this.recargarPosicion();
    } catch (error) {
      console.error('[Localizaciones] Error al iniciar Leaflet:', error);
      this.errorMapa.set(error instanceof Error ? error.message : 'No se pudo iniciar el mapa.');
    }
  }

  ngOnDestroy(): void {
    this.componenteDestruido = true;
    this.observadorTamano?.disconnect();
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
    this.redibujarMarcadores();
  }

  seleccionarDispositivo(elemento: ElementoLocalizacion): void {
    if (elemento.esYo) return;
    this.seleccionados.update(actuales => new Set([...actuales, elemento.clave]));
    const ubicacion = this.historial()[elemento.clave]?.at(-1) ?? elemento.localizacion;
    if (ubicacion && this.mapa) {
      this.mapa.setView([Number(ubicacion.latitud), Number(ubicacion.longitud)], 16);
    }
    this.redibujarMarcadores();
  }

  buscarHistorial(): void {
    const valores = this.filtros.getRawValue();
    if (valores.fechaInicial && valores.fechaFinal && valores.fechaInicial > valores.fechaFinal) {
      this.errorHistorial.set('La fecha inicial debe ser anterior a la fecha final.');
      return;
    }

    const fechaInicial = valores.fechaInicial
      ? this.formatearFechaHora(valores.fechaInicial, valores.horaInicial || '00:00', 0) : undefined;
    const fechaFinal = valores.fechaFinal
      ? this.formatearFechaHora(valores.fechaFinal, valores.horaFinal || '23:59', 59) : undefined;

    this.buscando.set(true);
    this.errorHistorial.set('');
    this.servicioDispositivo.obtenerLocalizaciones({
      claves: (Array.isArray(this.dispositivos()) ? this.dispositivos() : []).map(dispositivo => dispositivo.clave).join(','),
      fechaInicial,
      fechaFinal
    }).subscribe({
      next: respuesta => {
        const rutas: Record<string, Localizacion[]> = {};
        for (const punto of Array.isArray(respuesta.datos) ? respuesta.datos : []) {
          (rutas[punto.claveDispositivo] ??= []).push({
            latitud: Number(punto.latitud), longitud: Number(punto.longitud),
            altitud: Number(punto.altitud), fecha: punto.fecha
          });
        }
        this.historial.set(rutas);
        this.dispositivos.update(dispositivos => dispositivos.map(dispositivo => ({
          ...dispositivo,
          localizaciones: rutas[dispositivo.clave] ?? []
        })));
        this.buscando.set(false);
        this.redibujarMarcadores();
      },
      error: () => {
        this.buscando.set(false);
        this.errorHistorial.set('No se pudo obtener el historial de localizaciones.');
      }
    });
  }

  private formatearFechaHora(fecha: Date, hora: string, segundos: number): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}T${hora}:${String(segundos).padStart(2, '0')}`;
  }

  estaSeleccionado(clave: string): boolean {
    return this.seleccionados().has(clave);
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
    const lista = Array.isArray(dispositivos)
      ? dispositivos.filter((dispositivo): dispositivo is Dispositivo =>
        Boolean(dispositivo && typeof dispositivo === 'object' && typeof dispositivo.clave === 'string'))
      : [];
    const anteriores = new Set((Array.isArray(this.dispositivos()) ? this.dispositivos() : []).map(dispositivo => dispositivo.clave));
    const localizables = lista.filter(dispositivo =>
      typeof dispositivo.cualidades === 'string' && dispositivo.cualidades.split(',').some(cualidad => cualidad.trim() === 'LOC')
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
    const dispositivos = Array.isArray(this.dispositivos()) ? this.dispositivos() : [];
    const indice = dispositivos.findIndex(actual => actual.clave === dispositivo.clave);

    if (indice === -1) {
      if (typeof dispositivo.cualidades === 'string' && dispositivo.cualidades.split(',').some(cualidad => cualidad.trim() === 'LOC')) {
        this.reemplazarDispositivos([...dispositivos, dispositivo]);
      }
      return;
    }

    const actualizados = [...dispositivos];
    actualizados[indice] = { ...actualizados[indice], ...dispositivo };
    this.reemplazarDispositivos(actualizados);
  }

  private colorDispositivo(indice: number): string {
    const colores = ['#2563a6', '#7c4d9e', '#087f8c', '#ad6b16', '#4856a6', '#7356b5', '#176f83', '#715b32'];
    return colores[indice % colores.length];
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

    try {
      this.errorMapa.set('');
      this.capaMarcadores.clearLayers();
      this.capaRutas?.clearLayers();
      const seleccionados = this.seleccionados();
      const miUbicacion = this.ubicacionPropia();
      const dispositivos = Array.isArray(this.dispositivos()) ? this.dispositivos() : [];

      if (miUbicacion && seleccionados.has(CLAVE_YO)) {
        this.agregarMarcador(miUbicacion, 'Yo', '#475569');
        if (recentrarEnYo) this.mapa.setView([miUbicacion.latitud, miUbicacion.longitud], 16);
      }

      for (const dispositivo of dispositivos) {
        const puntosHistorial = this.historial()[dispositivo.clave];
        const puntos = Array.isArray(puntosHistorial)
          ? puntosHistorial.filter(punto => Number.isFinite(punto?.latitud) && Number.isFinite(punto?.longitud))
          : [];
        const indice = dispositivos.findIndex(actual => actual.clave === dispositivo.clave);
        if (seleccionados.has(dispositivo.clave) && puntos.length > 1) {
          this.leaflet.polyline(puntos.map(punto => [punto.latitud, punto.longitud] as [number, number]), {
            color: this.colorDispositivo(indice), weight: 4, opacity: 0.8
          }).addTo(this.capaRutas!);
        }
        const ubicacion = dispositivo.localizacion;
        if (!seleccionados.has(dispositivo.clave) || !ubicacion) continue;
        const latitud = Number(ubicacion.latitud);
        const longitud = Number(ubicacion.longitud);
        if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;

        this.agregarMarcador({ ...ubicacion, latitud, longitud }, dispositivo.alias || 'Sin alias', this.colorDispositivo(indice));
      }
    } catch (error) {
      console.error('[Localizaciones] Error al dibujar dispositivos en el mapa:', error);
      this.errorMapa.set(error instanceof Error ? error.message : 'No se pudieron dibujar las localizaciones.');
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

  alternarFiltros(): void {
    const abrir = !this.filtrosAbiertos();
    if (abrir && window.innerWidth < 760 && this.menuAbierto()) {
      this.menuAbierto.set(false);
    }
    this.filtrosAbiertos.set(abrir);
  }
}
