import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { Notificador } from '../../recursos/notificador';
import { ServicioAdministrador } from '../../servicios/servicio-administrador';

@Component({
  selector: 'formulario-pre-dispositivo',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './formulario-pre-dispositivo.html'
})
export class FormularioPreDispositivo extends Formulario {
  private readonly servicio = inject(ServicioAdministrador);
  private readonly dialogoServicio = inject(DialogoServicio);
  private readonly notificador = inject(Notificador);

  readonly formulario = new FormGroup({
    tipo: new FormControl<'I' | 'T' | 'C' | 'D' | null>(null, [Validators.required]),
    cualidades: new FormControl('', [Validators.maxLength(100)])
  });

  preparar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const datos = this.formulario.getRawValue();
    if (!datos.tipo) return;

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Crear pre-dispositivo',
        mensaje: '¿Está seguro de crear este pre-dispositivo?'
      },
      datos: { tipo: datos.tipo, cualidades: datos.cualidades?.trim() || null },
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  private finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado !== true) return;
    const datos = respuesta.datos as {
      tipo: 'I' | 'T' | 'C' | 'D';
      cualidades: string | null;
    } | undefined;
    if (!datos) return;
    this.servicio.crearPreDispositivo(datos).subscribe({
      next: (resultado) => {
        this.notificador.exitoso(`Pre-dispositivo creado. Clave: ${resultado.datos.clave}`);
        this.cerrar(true);
      },
      error: (error) => {
        this.notificador.error(error.error?.mensaje ?? 'No fue posible crear el pre-dispositivo.');
      }
    });
  }
}
