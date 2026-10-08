import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { Notificador } from '../../recursos/notificador';
import { Columna, TablaComponent } from '../../componentes/tabla/tabla.component';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { FormularioPreDispositivo } from '../../formularios/formulario-pre-dispositivo/formulario-pre-dispositivo';
import { Dispositivo } from '../../interfaces/dispositivo';
import { Cargador } from '../../recursos/cargador';

interface DispositivoAdministrativo {
  id: number;
  clave: string;
  estatus: boolean;
  cualidades: string | null;
  idDispositivo: number | null;
  aliasDispositivo: string | null;
  telefono: string | null;
  tipo: string;
  tipoTexto: string;
  idUsuario: number | null;
  aliasUsuario: string | null;
  correoUsuario: string | null;
  fechaFinalSuscripcion: string | null;
  estatusTexto: string;
  asignacionTexto: string;
  usuarioTexto: string;
}

@Component({
  selector: 'app-pagina-dispositivos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatExpansionModule,
    ReactiveFormsModule,
    TablaComponent,
  ],
  templateUrl: './pagina-dispositivos.html',
  styleUrl: './pagina-dispositivos.scss'
})
export class PaginaDispositivos implements OnInit {

  private readonly administradorServicio = inject(ServicioAdministrador);
  private readonly dialogoServicio = inject(DialogoServicio);
  private readonly notificador = inject(Notificador);
  private readonly cargador = inject(Cargador)

  readonly dispositivos = signal<DispositivoAdministrativo[]>([]);
  readonly filtrosExpandido = signal(false);

  readonly filtros = new FormGroup({
    clave: new FormControl(''),
    tipoTexto: new FormControl(''),
    usuarioTexto: new FormControl(''),
    asignacionTexto: new FormControl(''),
    estatusTexto: new FormControl('')
  })

  readonly columnas: Columna[] = [
    { clave: 'clave', titulo: 'Clave', formato: 'texto' },
    { clave: 'tipoTexto', titulo: 'Tipo', formato: 'texto' },
    { clave: 'estatusTexto', titulo: 'Estatus', formato: 'texto' },
    { clave: 'asignacionTexto', titulo: 'Asignación', formato: 'texto' },
    { clave: 'usuarioTexto', titulo: 'Usuario', formato: 'texto' },
    {
      clave: 'acciones',
      titulo: '',
      formato: 'botones',
      botones: [
        {
          icono: 'edit',
          tooltip: () => 'Editar pre-dispositivo',
          accion: (fila) => this.abrirFormulario(fila as Dispositivo)
        },
        {
          icono: 'download',
          tooltip: () => 'Descargar certificados',
          accion: (fila) => this.descargarCertificados(fila as DispositivoAdministrativo)
        }
      ]
    }
  ];

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargador.mostrar()
    this.administradorServicio.obtenerListaDispositivos().subscribe({
      next: (respuesta) => {
        this.dispositivos.set(respuesta.datos.map((dispositivo) => ({
          ...dispositivo,
          estatusTexto: dispositivo.estatus ? 'Activo' : 'Inactivo',
          asignacionTexto: dispositivo.idDispositivo ? 'Asignado' : 'Disponible',
          usuarioTexto: dispositivo.aliasUsuario
        })));
      }
    });
  }

  public abrirFormulario(dispositivo?: Dispositivo): void {
    this.dialogoServicio.abrir({
      referencia: FormularioPreDispositivo,
      titulo: 'Pre dispositivo',
      icono: 'devices',
      largo: 'l35%,m55%,c100%',
      desactivarAutocerrado: true,
      parametros: dispositivo ? 'A' : 'C',
      datos: dispositivo,
      alFinalizar: this.alFinalizarAbrirFormulario.bind(this)
    });
  }

  public alFinalizarAbrirFormulario(respuesta: any): void {
    if (respuesta?.resultado === true) this.cargar();
  }

  public descargarCertificados(dispositivo: DispositivoAdministrativo): void {
    this.administradorServicio.descargarCertificados(dispositivo.clave).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `certificados-${dispositivo.clave}.zip`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.notificador.exitoso('Certificados descargados.');
      },
      error: () => {
        this.notificador.error('No fue posible descargar los certificados.');
      }
    });
  }

  public reiniciarFiltros(): void {
    this.filtros.reset()
    this.buscar()
  }

  public buscar(): void {
    this.cargar()
  }

  public intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

}
