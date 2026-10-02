import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Dispositivo } from '../../interfaces/dispositivo';
import { Notificador } from '../../recursos/notificador';
import { Socket } from '../../recursos/socket';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { ServicioSuscripciones } from '../../servicios/servicio-suscripciones';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';

@Component({
  selector: 'app-formulario-suscripcion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule
  ],
  templateUrl: './formulario-suscripcion.html',
  styleUrls: ['./formulario-suscripcion.scss']
})
export class FormularioSuscripcion extends Formulario {

  private servicioSuscripciones = inject(ServicioSuscripciones);
  private socket = inject(Socket);
  private dialogoServicio = inject(DialogoServicio);
  private notificador = inject(Notificador);
  private _formBuilder = inject(FormBuilder);

  public dispositivos: Dispositivo[] = [];
  public tiposSuscripcionFiltrados: any[] = [];
  public resumenSuscripcion: any = null;

  formulario: FormGroup = this._formBuilder.group({
    claveDispositivo: ['', Validators.required],
    tipoSuscripcion: ['', Validators.required],
  });

  ngOnInit(): void {

    this.socket.dispositivos$
      .subscribe(dispositivos => {
        this.dispositivos = dispositivos;
      });

    this.formulario.get('claveDispositivo')!.valueChanges
      .subscribe(clave => {
        if (clave) {
          this.obtenerSuscripciones(clave);
          this.formulario.get('tipoSuscripcion')!.reset();
          this.resumenSuscripcion = null;
        }
      });

    this.formulario.get('tipoSuscripcion')!.valueChanges
      .subscribe(tipo => {
        if (tipo && this.formulario.get('claveDispositivo')!.valid) {
          this.obtenerResumenSuscripcion();
        }
      });
  }

  private obtenerSuscripciones(claveDispositivo: string): void {
    this.servicioSuscripciones.obtenerSuscripcionesDispositivo(claveDispositivo).subscribe({
      next: (respuesta: any) => {
        this.tiposSuscripcionFiltrados = respuesta.datos;
      }
    });
  }

  private obtenerResumenSuscripcion(): void {
    const claveDispositivo = this.formulario.value.claveDispositivo;
    const tipoSuscripcion = this.formulario.value.tipoSuscripcion;

    this.servicioSuscripciones.obtenerResumenSuscripcion(claveDispositivo, tipoSuscripcion).subscribe({
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
          tipo: respuesta.datos.tipoSuscripcion,
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

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Crear nueva suscripción',
        mensaje: '¿Está seguro de crear la nueva suscripción?',
      },
      alFinalizar: this.finalizarConfirmacion.bind(this),
      datos
    });
  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado === true) {
      this.crear(respuesta.datos);
    }
  }

  private crear(datos: any): void {
    this.servicioSuscripciones.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso('La suscripción se ha creado exitosamente.');
        this.cerrar(true);
      }
    });
  }
}
