import { Component, inject, Input } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Notificador } from '../../recursos/notificador';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoBase } from '../../recursos/dialogo.base';
import { EstadoDialogo } from '../../recursos/dialogo.contenedor';
import { Formulario } from '../../recursos/dialogo.base.formulario';


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
  ],
  templateUrl: './formulario-dispositivo.html',
})
export class FormularioDispositivo extends Formulario {

  private notificador = inject(Notificador);
  private servicioDispositivo = inject(ServicioDispositivo);
  private dialog = inject(MatDialog);

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

    const datos = this.formulario.getRawValue();

    const esActualizar = this.parametros.accion == 'A';

    const dialogRef = this.dialog.open(DialogoConfirmacion, {
      width: '420px',
      data: {
        titulo: esActualizar ? 'Actualizar dispositivo' : 'Crear dispositivo',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el dispositivo?'
          : '¿Está seguro de crear este dispositivo?',
        textoSi: 'Sí',
        textoNo: 'No'
      }
    });

    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta !== true) {
        return;
      }

      esActualizar
        ? this.actualizar(datos)
        : this.crear(datos);
    });

  }

  public crear(datos: any): void {
    this.servicioDispositivo.crear(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Dispositivo creado exitosamente.")
        this.cerrar(true)
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }

  public actualizar(datos: any): void {
    this.servicioDispositivo.actualizar(datos).subscribe({
      next: () => {
        this.notificador.exitoso("Dispositivo actualizado exitosamente.")
        this.cerrar(true)
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }
}
