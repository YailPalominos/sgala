import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { Columna, Filtros, TablaComponent } from '../../componentes/tabla/tabla.component';
import { Notificador } from '../../recursos/notificador';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';
import { Observable } from 'rxjs';
import { Respuesta } from '../../recursos/conexion';
import { Menu } from '../../componentes/menu/menu.component';

interface Administrador {
  id: number;
  nombres: string;
  apellidos: string;
  direccionCorreoElectronico: string;
  estatus: boolean;
  alias: string;
  permisos: string | null;
  estadoTexto: string;
}

@Component({
  selector: 'app-pagina-administradores',
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
    Menu
  ],
  templateUrl: './pagina-administradores.html',
  styleUrl: './pagina-administradores.scss'
})
export class PaginaAdministradores implements OnInit {
  private readonly servicio = inject(ServicioAdministrador);
  private readonly notificador = inject(Notificador);

  readonly administradores = signal<Administrador[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly formularioAbierto = signal(false);
  readonly idEdicion = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly filtrosExpandido = signal(false);
  readonly filtros = signal<Filtros>({
    etiqueta: '',
    marcador: '',
    texto: '',
    mostrarBusqueda: false,
    criterios: {}
  });
  readonly formularioFiltros = new FormGroup({
    alias: new FormControl(''),
    direccionCorreoElectronico: new FormControl(''),
    estadoTexto: new FormControl('')
  });
  readonly formulario = new FormGroup({
    nombres: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    apellidos: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    direccionCorreoElectronico: new FormControl('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(100)
    ]),
    alias: new FormControl('', [Validators.required, Validators.maxLength(15)]),
    contrasena: new FormControl('', [Validators.maxLength(255)]),
    estatus: new FormControl<boolean | null>(true, [Validators.required]),
    permisos: new FormControl('', [Validators.maxLength(500)])
  });
  readonly columnas: Columna[] = [
    { clave: 'id', titulo: 'ID', formato: 'texto' },
    { clave: 'nombres', titulo: 'Nombres', formato: 'texto' },
    { clave: 'apellidos', titulo: 'Apellidos', formato: 'texto' },
    { clave: 'alias', titulo: 'Alias', formato: 'texto' },
    { clave: 'direccionCorreoElectronico', titulo: 'Correo electrónico', formato: 'texto' },
    { clave: 'estadoTexto', titulo: 'Estado', formato: 'texto' },
    {
      clave: 'acciones',
      titulo: '',
      formato: 'botones',
      botones: [{
        icono: 'edit',
        tooltip: () => 'Editar administrador',
        accion: (fila) => this.editar(fila as Administrador)
      }]
    }
  ];

  ngOnInit(): void {
    this.cargar();
  }

  intercalarFiltros(): void {
    this.filtrosExpandido.update((expandido) => !expandido);
  }

  abrirCrear(): void {
    this.idEdicion.set(null);
    this.formulario.reset({
      nombres: '',
      apellidos: '',
      direccionCorreoElectronico: '',
      alias: '',
      contrasena: '',
      estatus: true,
      permisos: ''
    });
    this.formulario.controls.contrasena.setValidators([
      Validators.required,
      Validators.maxLength(255)
    ]);
    this.formularioAbierto.set(true);
    this.error.set(null);
  }

  editar(administrador: Administrador): void {
    this.idEdicion.set(administrador.id);
    this.formulario.reset({
      nombres: administrador.nombres,
      apellidos: administrador.apellidos,
      direccionCorreoElectronico: administrador.direccionCorreoElectronico,
      alias: administrador.alias,
      contrasena: '',
      estatus: administrador.estatus,
      permisos: administrador.permisos ?? ''
    });
    this.formulario.controls.contrasena.setValidators([Validators.maxLength(255)]);
    this.formularioAbierto.set(true);
    this.error.set(null);
  }

  cancelar(): void {
    this.formularioAbierto.set(false);
    this.error.set(null);
  }

  buscar(): void {
    this.filtros.update((actual) => ({
      ...actual,
      texto: '',
      criterios: Object.fromEntries(
        Object.entries(this.formularioFiltros.getRawValue())
          .filter(([, valor]) => Boolean(valor?.trim()))
          .map(([clave, valor]) => [clave, valor!.trim()])
      )
    }));
  }

  reiniciarFiltros(): void {
    this.formularioFiltros.reset({
      alias: '',
      direccionCorreoElectronico: '',
      estadoTexto: ''
    });
    this.filtros.update((actual) => ({ ...actual, texto: '', criterios: {} }));
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtenerLista().subscribe({
      next: (respuesta) => {
        this.administradores.set(respuesta.datos.map((administrador) => ({
          ...administrador,
          estadoTexto: administrador.estatus ? 'Activo' : 'Inactivo'
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.notificador.error('No fue posible cargar los administradores.');
        this.cargando.set(false);
      }
    });
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const datos = this.formulario.getRawValue();
    const id = this.idEdicion();
    const payload = {
      ...(id === null ? {} : { id }),
      nombres: datos.nombres!.trim(),
      apellidos: datos.apellidos!.trim(),
      direccionCorreoElectronico: datos.direccionCorreoElectronico!.trim(),
      alias: datos.alias!.trim(),
      contrasena: datos.contrasena ?? '',
      estatus: datos.estatus!,
      permisos: datos.permisos?.trim() || null
    };

    this.guardando.set(true);
    const solicitud: Observable<Respuesta<unknown>> = id === null
      ? this.servicio.crear(payload)
      : this.servicio.actualizar(payload);
    solicitud.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cancelar();
        this.notificador.exitoso(id === null
          ? 'Administrador creado exitosamente.'
          : 'Administrador actualizado exitosamente.');
        this.cargar();
      },
      error: (respuesta) => {
        this.guardando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No fue posible guardar el administrador.');
      }
    });
  }
}
