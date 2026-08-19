import { Component, inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { Dispositivo } from '../../interfaces/dispositivo';
import { Notificador } from '../../recursos/notificador';
import { Socket } from '../../recursos/socket';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { ServicioSuscripciones } from '../../servicios/servicio-suscripciones';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
@Component({
  selector: 'app-agregar-dispositivo-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatSelectModule,
    MatCardModule
  ],
  templateUrl: './formulario-suscripcion.html',
  styleUrls: ['./formulario-suscripcion.scss']
})

export class FormularioSuscripcion extends Formulario {

  private servicioSuscricpiones = inject(ServicioSuscripciones);
  private socket = inject(Socket);
  private cdr = inject(ChangeDetectorRef);
  private dialogoServicio = inject(DialogoServicio)
  private notificador = inject(Notificador)

  @ViewChild('stepper') stepper!: MatStepper;

  public dispositivos: Dispositivo[] = [];

  tiposSuscripcionFiltrados: any[] = [];
  preciosPorTipo: Map<string, any> = new Map();
  nombresAtributos: { [key: string]: string } = {
    'LOC': 'Localización',
    'COC': 'Corta corrientes',
    'ALA': 'Alarma sensor'
  };

  private _formBuilder = inject(FormBuilder);

  formulario = this._formBuilder.group({
    claveDispositivo: ['', Validators.required],
  });

  formulario1 = this._formBuilder.group({
    claveDispositivo: ['', Validators.required],
  });
  formulario2 = this._formBuilder.group({
    tipoSuscripcion: ['', Validators.required],
  });

  ngOnInit(): void {

    // Suscribirse a dispositivos desde el socket
    this.socket.dispositivos$
      .subscribe(dispositivos => {
        this.dispositivos = dispositivos;
      });


    this.formulario1.statusChanges.pipe(
      map(status => status === 'VALID'),
      distinctUntilChanged(),
      filter(valid => valid)
    ).subscribe(() => {
      this.avanzarStepper();
    });

    this.formulario1.valueChanges.subscribe(() => {
      if (this.formulario1.valid) {
        this.obtenerSuscripciones();
      }
    });

    this.formulario2.statusChanges.pipe(
      map(status => status === 'VALID'),
      distinctUntilChanged(),
      filter(valid => valid)
    ).subscribe(() => {
      this.avanzarStepper();
    });

    this.formulario2.valueChanges.subscribe(() => {
      if (this.formulario2.valid) {
        this.obtenerResumenSuscripcion();
      }
    });


  }

  private avanzarStepper(): void {
    // Forzar detección de cambios para que Angular actualice el estado
    this.cdr.detectChanges();

    // Esperar a que el stepper esté completamente inicializado
    setTimeout(() => {
      if (this.stepper) {
        this.stepper.next();
      }
    }, 50);
  }

  public obtenerSuscripciones(): void {
    const claveDispositivo = this.formulario1.value.claveDispositivo;
    if (!claveDispositivo) {
      throw new Error('La clave del dispositivo es requerida.');
    }

    this.servicioSuscricpiones.obtenerSuscripcionesDispositivo(claveDispositivo).subscribe({
      next: (respuesta: any) => {
        this.tiposSuscripcionFiltrados = respuesta.datos
      }
    });
  }

  resumenSuscripcion: any = null;

  public obtenerResumenSuscripcion(): void {
    const claveDispositivo = this.formulario1.value.claveDispositivo;
    if (!claveDispositivo) {
      throw new Error('La clave del dispositivo es requerida.');
    }

    const tipoSuscripcion = this.formulario2.value.tipoSuscripcion;

    if (!tipoSuscripcion) {
      throw new Error('La clave del dispositivo es requerida.');
    }

    this.servicioSuscricpiones.obtenerResumenSuscripcion(claveDispositivo, tipoSuscripcion).subscribe({
      next: (respuesta: any) => {
        const inicio = new Date(respuesta.datos.fechaInicial);
        const fin = new Date(respuesta.datos.fechaFinal);

        const formato = new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        const dias = Math.round(
          (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
        );

        this.resumenSuscripcion = {
          periodo: `${formato.format(inicio)} - ${formato.format(fin)} (${dias} días)`,
          detalles: respuesta.datos.detalles,
          total: respuesta.datos.total,
          tipoSuscripcion: respuesta.datos.tipoSuscripcion,
          tipoSuscripcionTexto: respuesta.datos.tipoSuscripcion === 'G'
            ? 'Gratis'
            : respuesta.datos.tipoSuscripcion === 'S'
              ? 'Semestral'
              : respuesta.datos.tipoSuscripcion === 'A'
                ? 'Anual'
                : '-'
        };
      }
    });
  }

  public preparar(): void {

    if (this.formulario1.invalid) {
      this.formulario1.markAllAsTouched();
      throw new Error(
        'Debe seleccionar un dispositivo antes de continuar.'
      );
    }

    if (this.formulario2.invalid) {
      this.formulario2.markAllAsTouched();
      throw new Error(
        'Debe seleccionar el tipo de suscripción antes de continuar.'
      );
    }

    const datos1 = this.formulario1.getRawValue();
    const datos2 = this.formulario2.getRawValue();

    const claveDispositivo = datos1.claveDispositivo;
    const tipoSuscripcion = datos2.tipoSuscripcion;

    const datos = {
      claveDispositivo,
      tipoSuscripcion
    };

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      ancho: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Crear nueva suscripcion',
        mensaje: '¿Está seguro de crear la nueva suscripción?.',
      },
      alFinalizar: this.finalizarConfirmacion,
      clase: this.constructor.name,
      datos
    });
  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      this.crear(respuesta.datos)
    }
  }

  private crear(datos: any) {
    this.servicioSuscricpiones.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso("La suscripción se ha creado exitosamente.")
        this.cerrar(true)
      }
    })
  }

}
