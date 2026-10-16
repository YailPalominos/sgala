import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'formulario-evento',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './formulario-evento.html'
})
export class FormularioEvento extends Formulario {

  public dias = [
    { valor: 'LU', texto: 'Lunes' },
    { valor: 'MA', texto: 'Martes' },
    { valor: 'MI', texto: 'Miércoles' },
    { valor: 'JU', texto: 'Jueves' },
    { valor: 'VI', texto: 'Viernes' },
    { valor: 'SA', texto: 'Sábado' },
    { valor: 'DO', texto: 'Domingo' }
  ];

  private dialogoServicio = inject(DialogoServicio);

  public formulario = new FormGroup({
    tipo: new FormControl('', [
      Validators.required
    ]),
    dia: new FormControl('', [
      Validators.required
    ]),
    fecha: new FormControl('', [
      Validators.required
    ]),
    hora: new FormControl('', [
      Validators.required,
      Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    ]),
    accion: new FormControl('', [
      Validators.required
    ])
  });


  override iniciar(): void {
    if (this.parametros != 'A') {
      return
    }
    const fecha: string = this.datos.fecha;

    const repetible = fecha.match(
      /^(LU|MA|MI|JU|VI|SA|DO)#(\d{2}):(\d{2}):(\d{2})$/
    );

    if (repetible) {
      const [, dia, hora, minuto] = repetible;

      this.formulario.patchValue({
        tipo: 'R',
        dia,
        fecha: '',
        hora: `${hora}:${minuto}`,
        accion: this.datos.accion
      });
    } else {
      const unica = fecha.match(
        /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}):(\d{2})$/
      );

      if (unica) {
        const [, fechaUnica, hora] = unica;

        this.formulario.patchValue({
          tipo: 'U',
          dia: undefined,
          fecha: fechaUnica,
          hora,
          accion: this.datos.accion
        });
      }
    }

    this.actualizarValidaciones();
  }


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
      largo: 'l25%,m45%,c100%',
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
      this.cerrar({ datos: respuesta.datos, esActualizar: respuesta.parametros.esActualizar })
    }
  }

  public actualizarValidaciones(): void {
    const tipo = this.formulario.controls.tipo.value;
    if (tipo == undefined) {
      return
    }
    const esRepetible = tipo === 'R';

    const { dia, fecha, hora } = this.formulario.controls;

    dia.clearValidators();
    fecha.clearValidators();

    hora.setValidators([
      Validators.required,
      Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    ]);

    if (esRepetible) {
      dia.setValidators([Validators.required]);
    } else {
      fecha.setValidators([Validators.required]);
    }

    dia.updateValueAndValidity({ emitEvent: false });
    fecha.updateValueAndValidity({ emitEvent: false });
    hora.updateValueAndValidity({ emitEvent: false });
  }
}
