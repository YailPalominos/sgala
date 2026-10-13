import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Notificador } from '../../recursos/notificador';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { NgxMaskDirective } from 'ngx-mask';
import { MatSelectModule } from '@angular/material/select';
import { Columna, TablaComponent } from '../../componentes/tabla/tabla.component';

@Component({
  selector: 'formulario-configuracion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgxMaskDirective,
    MatSelectModule,
    TablaComponent
  ],
  templateUrl: './formulario-configuracion.html',
  styleUrls: ['./formulario-configuracion.scss']
})
export class FormularioConfiguracion extends Formulario {

  public formulario = new FormGroup({
    clave: new FormControl(''),
    gpioRgbRojo: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(27)
    ]),
    gpioRgbVerde: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(27)
    ]),
    gpioRgbAzul: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(27)
    ]),
    gpioBoton: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(27)
    ]),
    gpioRelevador: new FormControl('', [
      Validators.required,
      Validators.min(0),
      Validators.max(27)
    ]),
    tolerancia: new FormControl('', [
      Validators.required,
      Validators.min(0)
    ]),
    zonaHoraria: new FormControl('', [
      Validators.required
    ])
  });

  public eventos: any[] = []
  public columnas: Columna[] = [
    {
      clave: 'fecha',
      titulo: 'Fecha / horario',
      formato: 'texto'
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      formato: 'texto'
    },
    {
      clave: 'accion',
      titulo: 'Acción',
      formato: 'texto'
    },
    {
      clave: 'botones',
      titulo: '',
      formato: 'botones',
      botones: [
        {
          posicion: 'encabezado',
          icono: 'add',
          tooltip: () => 'Crear evento',
          // accion: (fila: any) => this.editarEvento(fila)
        },
        {
          icono: 'edit',
          tooltip: () => 'Editar evento',
          // accion: (fila: any) => this.editarEvento(fila)
        },
        {
          icono: 'delete',
          tooltip: () => 'Eliminar evento',
          estilos: () => 'color: #c62828',
          // accion: (fila: any) => this.eliminarEvento(fila)
        }
      ]
    }
  ];

  public zonasHorarias = [
    { valor: 'America/Mexico_City', texto: 'Centro de México' },
    { valor: 'America/Cancun', texto: 'Quintana Roo' },
    { valor: 'America/Merida', texto: 'Yucatán' },
    { valor: 'America/Monterrey', texto: 'Monterrey' },
    { valor: 'America/Matamoros', texto: 'Matamoros' },
    { valor: 'America/Chihuahua', texto: 'Chihuahua' },
    { valor: 'America/Ciudad_Juarez', texto: 'Ciudad Juárez' },
    { valor: 'America/Ojinaga', texto: 'Ojinaga' },
    { valor: 'America/Hermosillo', texto: 'Hermosillo' },
    { valor: 'America/Tijuana', texto: 'Tijuana' },
    { valor: 'America/Bahia_Banderas', texto: 'Bahía de Banderas' },
    { valor: 'America/Mazatlan', texto: 'Mazatlán' }
  ];

  public dias = [
    { valor: 'LU', texto: 'Lunes' },
    { valor: 'MA', texto: 'Martes' },
    { valor: 'MI', texto: 'Miércoles' },
    { valor: 'JU', texto: 'Jueves' },
    { valor: 'VI', texto: 'Viernes' },
    { valor: 'SA', texto: 'Sábado' },
    { valor: 'DO', texto: 'Domingo' }
  ];

  constructor(
    private dialog: MatDialog,
    private notificador: Notificador,
    private servicioDispositivo: ServicioDispositivo
  ) {
    super();
  }

  public preparar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.notificador.error('Revisa los campos obligatorios.');
      return;
    }

    const datos = {
      ...this.formulario.getRawValue(),
      clave: Number(this.formulario.value.clave),
      gpioRgbRojo: Number(this.formulario.value.gpioRgbRojo),
      gpioRgbVerde: Number(this.formulario.value.gpioRgbVerde),
      gpioRgbAzul: Number(this.formulario.value.gpioRgbAzul),
      gpioBoton: Number(this.formulario.value.gpioBoton),
      gpioRelevador: Number(this.formulario.value.gpioRelevador),
      tolerancia: Number(this.formulario.value.tolerancia),
      eventos: this.eventos.map(evento => ({
        fecha: evento.fecha,
        accion: evento.accion
      }))
    };

    const referencia = this.dialog.open(DialogoConfirmacion, {
      data: {
        titulo: 'Actualizar configuración',
        mensaje: '¿Deseas actualizar la configuración del dispositivo?'
      }
    });

    referencia.afterClosed().subscribe(confirmado => {
      if (!confirmado) {
        return;
      }

      this.servicioDispositivo.actualizarConfiguracion(datos).subscribe({
        next: () => {
          this.notificador.exitoso('Configuración actualizada correctamente.');
          this.cerrar(true);
        },
      });
      ;

    });
  }
}