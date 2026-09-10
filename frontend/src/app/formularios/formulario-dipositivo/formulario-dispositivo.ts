import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxMaskDirective } from 'ngx-mask';
import { Notificador } from '../../recursos/notificador';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';


@Component({
  selector: 'formulario-dispositivo',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective
  ],
  templateUrl: './formulario-dispositivo.html',
  styles: [`
    .dato-clave {
      text-align: center;
      font-size: 12px;
      color: #757575;
      font-family: monospace;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
  `]
})
export class FormularioDispositivo extends Formulario {

  private notificador = inject(Notificador);
  private servicioDispositivo = inject(ServicioDispositivo);
  private dialogoServicio = inject(DialogoServicio);

  public formulario = new FormGroup({
    clave: new FormControl(''),
    alias: new FormControl('', [
      Validators.required,
      Validators.maxLength(25),
      Validators.pattern(/^[a-zA-Z0-9]+$/)
    ]),
    telefono: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]{10}$/)
    ]),
  });


  public preparar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      throw new Error('El formulario contiene datos inválidos.');
    }

    if (!this.hayCambios()) {
      throw new Error('No se realizaron cambios.');
    }

    const datos = this.formulario.getRawValue();
    const esActualizar = this.parametros == 'A';

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: '450px',
      desactivarAutocerrado: true,
      parametros: {
        titulo: esActualizar ? 'Actualizar dispositivo' : 'Crear dispositivo',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el dispositivo?'
          : '¿Está seguro de crear este dispositivo?',
        textoSi: 'Sí',
        textoNo: 'No',
        esActualizar: esActualizar
      },
      datos: datos,
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      if (respuesta.parametros.esActualizar == true) {
        this.actualizar(respuesta.datos)
      } else {
        this.crear(respuesta.datos);
      }
    }
  }

  public crear(datos: any): void {
    this.servicioDispositivo.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Dispositivo creado exitosamente.")
        this.cerrar(true)
      }
    });
  }

  public actualizar(datos: any): void {
    this.servicioDispositivo.actualizar(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Dispositivo actualizado exitosamente.")
        this.cerrar(true)
      }
    });
  }
}
