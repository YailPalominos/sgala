import { Component, inject, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { ConfirmacionDialogComponent } from '../confirmacion/confirmacion.dialog';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { DatosServicio } from '../../servicios/datos.servicio';
import { SocketServicio } from '../../servicios/socket.servicio';
import { Dispositivo } from '../../interfaces/dispositivo.interface';
import { Subscription } from 'rxjs';

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
  templateUrl: './dialogo-suscripcion.html',
  styleUrls: ['./dialogo-suscripcion.scss']
})
export class DialogoSuscripcion implements OnInit {
  private datosServicio = inject(DatosServicio);
  private notificadorServicio = inject(NotificadorServicio);
  private cargadorServicio = inject(CargadorServicio);
  private dialogRef = inject(MatDialogRef<DialogoSuscripcion>);
  private socketServicio = inject(SocketServicio);
  private cdr = inject(ChangeDetectorRef);

  private dialog = inject(MatDialog);
  // private suscripciones: Subscription[] = [];

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

  formulario1 = this._formBuilder.group({
    claveDispositivo: ['', Validators.required],
  });
  formulario2 = this._formBuilder.group({
    tipoSuscripcion: ['', Validators.required],
  });

  protected data = inject<any>(MAT_DIALOG_DATA);

  ngOnInit(): void {

    // Suscribirse a dispositivos desde el socket
    this.socketServicio.dispositivos$
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

    this.cargadorServicio.mostrar()
    this.datosServicio.obtenerSuscripcionesDispositivo(claveDispositivo).subscribe({
      next: (respuesta: any) => {
        this.cargadorServicio.ocultar();
        this.tiposSuscripcionFiltrados = respuesta.datos
      },
      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
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

    this.cargadorServicio.mostrar()
    this.datosServicio.obtenerResumenSuscripcion(claveDispositivo, tipoSuscripcion).subscribe({
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

        this.cargadorServicio.ocultar();
      },
      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
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

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      data: {
        titulo: 'Crear nueva suscripcion',
        mensaje: '¿Está seguro de crear la nueva suscripción?.',
        textoSi: 'Sí',
        textoNo: 'No'
      }
    });

    const claveDispositivo = datos1.claveDispositivo;
    const tipoSuscripcion = datos2.tipoSuscripcion;

    const datos = {
      claveDispositivo,
      tipoSuscripcion
    };

    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta == true) {
        this.cargadorServicio.mostrar();
        this.datosServicio.crearSuscripcion(datos).subscribe({
          next: () => {
            this.notificadorServicio.exitoso("La suscripción se ha creado exitosamente.")
            this.cargadorServicio.ocultar();
            this.dialogRef.close(true)
          },
          error: (error: any) => {
            this.cargadorServicio.ocultar();
            throw new Error(error)
          }
        })

      }
    });
  }


}
