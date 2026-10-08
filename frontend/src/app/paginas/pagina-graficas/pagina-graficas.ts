import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

interface DispositivoGrafica {
  tipo: string;
  idDispositivo: number | null;
}

interface UsuarioGrafica {
  estatus: boolean;
}

interface EventoGrafica {
  fecha: string;
}

interface BarraGrafica {
  etiqueta: string;
  total: number;
  porcentaje: number;
}

interface DatoResumen {
  etiqueta: string;
  total: number;
  icono: string;
}

@Component({
  selector: 'app-pagina-graficas',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './pagina-graficas.html',
  styleUrl: './pagina-graficas.scss'
})
export class PaginaGraficas implements OnInit {
  private readonly administradorServicio = inject(ServicioAdministrador);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<DatoResumen[]>([]);
  readonly dispositivosPorTipo = signal<BarraGrafica[]>([]);
  readonly dispositivosPorAsignacion = signal<BarraGrafica[]>([]);
  readonly usuariosPorEstado = signal<BarraGrafica[]>([]);
  readonly eventosPorMes = signal<BarraGrafica[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      dispositivos: this.administradorServicio.obtenerListaDispositivos(),
      usuarios: this.administradorServicio.obtenerListaUsuarios(),
      eventos: this.administradorServicio.obtenerListaEventos()
    }).subscribe({
      next: ({ dispositivos: respuestaDispositivos, usuarios: respuestaUsuarios, eventos: respuestaEventos }) => {
        const dispositivos = respuestaDispositivos.datos as DispositivoGrafica[];
        const usuarios = respuestaUsuarios.datos as UsuarioGrafica[];
        const eventos = respuestaEventos.datos as EventoGrafica[];
        const asignados = dispositivos.filter((dispositivo) => dispositivo.idDispositivo !== null).length;
        const usuariosActivos = usuarios.filter((usuario) => usuario.estatus).length;

        this.resumen.set([
          { etiqueta: 'Pre-dispositivos', total: dispositivos.length, icono: 'devices' },
          { etiqueta: 'Usuarios', total: usuarios.length, icono: 'group' },
          { etiqueta: 'Eventos', total: eventos.length, icono: 'event' },
          { etiqueta: 'Dispositivos asignados', total: asignados, icono: 'link' }
        ]);
        this.dispositivosPorTipo.set(this.crearBarras(this.contarPor(
          dispositivos.map((dispositivo) => this.etiquetaTipo(dispositivo.tipo))
        )));
        this.dispositivosPorAsignacion.set(this.crearBarras([
          { etiqueta: 'Disponibles', total: dispositivos.length - asignados },
          { etiqueta: 'Asignados', total: asignados }
        ]));
        this.usuariosPorEstado.set(this.crearBarras([
          { etiqueta: 'Activos', total: usuariosActivos },
          { etiqueta: 'Inactivos', total: usuarios.length - usuariosActivos }
        ]));
        this.eventosPorMes.set(this.crearBarras(this.contarEventosPorMes(eventos)));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los datos para las gráficas.');
        this.cargando.set(false);
      }
    });
  }

  private etiquetaTipo(tipo: string): string {
    switch (tipo.trim().toUpperCase()) {
      case 'I':
      case 'INTERRUPTOR':
        return 'Interruptores';
      case 'T':
      case 'TIMBRE':
        return 'Timbres';
      case 'C':
      case 'CÁMARA':
      case 'CAMARA':
        return 'Cámaras';
      case 'D':
      case 'DISPOSITIVO':
        return 'Dispositivos';
      default:
        return tipo || 'Sin tipo';
    }
  }

  private contarPor(etiquetas: string[]): { etiqueta: string; total: number }[] {
    const conteos = new Map<string, number>();
    etiquetas.forEach((etiqueta) => conteos.set(etiqueta, (conteos.get(etiqueta) ?? 0) + 1));
    return Array.from(conteos, ([etiqueta, total]) => ({ etiqueta, total }));
  }

  private contarEventosPorMes(eventos: EventoGrafica[]): { etiqueta: string; total: number }[] {
    const ahora = new Date();
    const meses = Array.from({ length: 6 }, (_, indice) => {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - 5 + indice, 1);
      return {
        llave: `${fecha.getFullYear()}-${fecha.getMonth()}`,
        etiqueta: new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(fecha),
        total: 0
      };
    });
    const conteoPorMes = new Map(meses.map((mes) => [mes.llave, mes]));

    eventos.forEach(({ fecha }) => {
      const fechaEvento = new Date(fecha);
      if (Number.isNaN(fechaEvento.getTime())) return;
      const llave = `${fechaEvento.getFullYear()}-${fechaEvento.getMonth()}`;
      const mes = conteoPorMes.get(llave);
      if (mes) mes.total += 1;
    });

    return meses.map(({ etiqueta, total }) => ({ etiqueta, total }));
  }

  private crearBarras(datos: { etiqueta: string; total: number }[]): BarraGrafica[] {
    const maximo = Math.max(1, ...datos.map((dato) => dato.total));
    return datos.map((dato) => ({
      ...dato,
      porcentaje: dato.total === 0 ? 0 : Math.max(4, (dato.total / maximo) * 100)
    }));
  }
}
