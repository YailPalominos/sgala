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
    clave: new FormControl('', this.parametros === 'A' ? [Validators.required] : []),
    tipo: new FormControl<'I' | 'T' | 'C' | 'D' | 'Y' | 'M' | null>(null, [Validators.required]),
    cualidades: new FormControl('', [Validators.maxLength(100)])
  });

  preparar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const datos = this.formulario.getRawValue();

    const esActualizar = this.parametros === 'A';

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: esActualizar ? 'Actualizar pre-dispositivo' : 'Crear pre-dispositivo',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar este pre-dispositivo?'
          : '¿Está seguro de crear este pre-dispositivo?',
        esActualizar
      },
      datos,
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  private finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado !== true) return;
    if (respuesta.parametros.esActualizar === false) {
      this.servicio.crearPreDispositivo(respuesta.datos).subscribe({
        next: () => {
          this.notificador.exitoso(`Pre-dispositivo creado exitosamente.`);
          this.cerrar(true);
        }
      });
    } else {
      this.servicio.actualizarPreDispositivo(respuesta.datos).subscribe({
        next: () => {
          this.notificador.exitoso(`Pre-dispositivo actualizado exitosamente.`);
          this.cerrar(true);
        }
      });
    }

  }
}
