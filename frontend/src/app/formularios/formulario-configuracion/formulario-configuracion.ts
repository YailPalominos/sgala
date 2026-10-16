import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Notificador } from '../../recursos/notificador';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { Formulario } from '../../recursos/dialogo.formulario';
import { NgxMaskDirective } from 'ngx-mask';
import { MatSelectModule } from '@angular/material/select';
import { Columna, TablaComponent } from '../../componentes/tabla/tabla.component';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { FormularioEvento } from '../formulario-evento/formulario-evento';

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
    MatSelectModule,
    TablaComponent,
    NgxMaskDirective
  ],
  templateUrl: './formulario-configuracion.html'
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
      clave: 'fechaTexto',
      titulo: 'Fecha / horario',
      formato: 'texto'
    },
    {
      clave: 'tipoTexto',
      titulo: 'Tipo',
      formato: 'texto'
    },
    {
      clave: 'accionTexto',
      titulo: 'Acción',
      formato: 'texto'
    },
    {
      clave: 'botones',
      titulo: '',
      formato: 'botones',
      estilos: 'display: flex;justify-content: flex-end',
      botones: [
        {
          posicion: 'encabezado',
          icono: 'add',
          tooltip: () => 'Crear evento',
          accion: () => this.crearOActualizarEvento(undefined)
        },
        {
          icono: 'edit',
          tooltip: () => 'Editar evento',
          accion: (fila: any) => this.crearOActualizarEvento(fila)
        },
        {
          icono: 'delete',
          tooltip: () => 'Eliminar evento',
          accion: (fila: any) => this.eliminarEvento(fila)
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
    private dialogoServicio: DialogoServicio,
    private notificador: Notificador,
  ) {
    super();
  }


  override iniciar(): void {
    const ordenDias: Record<string, number> = {
      LU: 1,
      MA: 2,
      MI: 3,
      JU: 4,
      VI: 5,
      SA: 6,
      DO: 7
    };

    this.eventos = (this.datos?.eventos ?? [])
      .map((evento: any) => {
        const repetible =
          /^(LU|MA|MI|JU|VI|SA|DO)#\d{2}:\d{2}:\d{2}$/.test(evento.fecha);

        return {
          ...evento,
          tipoTexto: repetible ? 'Repetible' : 'Único',
          fechaTexto: repetible
            ? this.formatearFechaRepetible(evento.fecha)
            : this.formatearFechaUnica(evento.fecha),
          accionTexto: evento.accion === 'A'
            ? 'Activación'
            : evento.accion === 'D'
              ? 'Desactivación'
              : evento.accion
        };
      })
      .sort((a: any, b: any) => {
        const diaA = a.fecha.match(/^(LU|MA|MI|JU|VI|SA|DO)#/);
        const diaB = b.fecha.match(/^(LU|MA|MI|JU|VI|SA|DO)#/);

        // Los eventos repetibles aparecen primero.
        if (diaA && !diaB) return -1;
        if (!diaA && diaB) return 1;

        if (diaA && diaB) {
          const orden = ordenDias[diaA[1]] - ordenDias[diaB[1]];

          if (orden !== 0) return orden;

          // Ordenar por hora dentro del mismo día.
          return a.fecha.localeCompare(b.fecha);
        }

        // Los eventos únicos se ordenan cronológicamente.
        return a.fecha.localeCompare(b.fecha);
      })
      .map((evento: any, indice: number) => ({
        ...evento,
        numero: indice + 1
      }));
  }

  private formatearFechaRepetible(fecha: string): string {
    const [dia, hora] = fecha.split('#');

    const nombreDia = this.dias.find(
      d => d.valor === dia
    )?.texto ?? dia;

    return `${nombreDia} ${hora.slice(0, 5)}`;
  }

  private formatearFechaUnica(fecha: string): string {
    const coincidencia = fecha.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
    );

    if (!coincidencia) {
      return fecha;
    }

    const [, anio, mes, dia, hora, minuto, segundo] = coincidencia;

    return `${dia}/${mes}/${anio} ${hora}:${minuto}:${segundo}`;
  }

  public preparar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.notificador.error('Revisa los campos obligatorios.');
      return;
    }

    const datos = {
      ...this.formulario.getRawValue(),
      clave: this.formulario.value.clave,
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

    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Confirmar',
      icono: 'check',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Actualizar dispositivo',
        mensaje: '¿Está seguro de actualizar el dispositivo?',
        textoSi: 'Sí',
        textoNo: 'No',
      },
      datos: datos,
      alFinalizar: this.finalizarConfirmacion.bind(this)
    });
  }

  public finalizarConfirmacion(respuesta: any): void {
    if (respuesta?.resultado == true) {
      this.cerrar(respuesta.datos);
    }
  }

  public crearOActualizarEvento(evento?: any): void {
    this.dialogoServicio.abrir({
      referencia: FormularioEvento,
      recordar: false,
      titulo: evento ? 'Editar evento' : 'Crear evento',
      icono: evento ? 'edit' : 'add',
      largo: 'l35%,m55%,c100%',
      desactivarAutocerrado: true,
      parametros: evento == undefined ? 'C' : 'A',
      datos: evento,
      alFinalizar: this.finalizarcrearOActualizarEvento.bind(this)
    });
  }

  public finalizarcrearOActualizarEvento(respuesta: any): void {
    if (!respuesta?.resultado) {
      return;
    }

    const datos = respuesta.resultado.datos;

    // Reconstruir los datos originales del evento.
    const evento = {
      fecha: datos.tipo === 'R'
        ? `${datos.dia}#${datos.hora}:00`
        : `${datos.fecha} ${datos.hora}:00`,
      accion: datos.accion
    };

    const repetible =
      /^(LU|MA|MI|JU|VI|SA|DO)#\d{2}:\d{2}:\d{2}$/.test(evento.fecha);

    const [dia, hora] = repetible
      ? evento.fecha.split('#')
      : ['', ''];

    const nombreDia = this.dias.find(
      d => d.valor === dia
    )?.texto ?? dia;

    const coincidencia = !repetible
      ? evento.fecha.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
      )
      : null;

    const eventoFormateado = {
      ...evento,
      tipoTexto: repetible ? 'Repetible' : 'Único',
      fechaTexto: repetible
        ? `${nombreDia} ${hora.slice(0, 5)}`
        : coincidencia
          ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]} ${coincidencia[4]}:${coincidencia[5]}:${coincidencia[6]}`
          : evento.fecha,
      accionTexto: evento.accion === 'A'
        ? 'Activación'
        : evento.accion === 'D'
          ? 'Desactivación'
          : evento.accion
    };

    if (respuesta.resultado.esActualizar) {
      this.eventos = this.eventos.map(actual =>
        actual.numero === respuesta.datos.numero
          ? {
            ...eventoFormateado,
            numero: actual.numero
          }
          : actual
      );
    } else {
      this.eventos = [...this.eventos, eventoFormateado];
    }

    // Mantener el orden: repetibles por día y hora,
    // después los únicos por fecha y hora.
    const ordenDias: Record<string, number> = {
      LU: 1,
      MA: 2,
      MI: 3,
      JU: 4,
      VI: 5,
      SA: 6,
      DO: 7
    };

    this.eventos = [...this.eventos]
      .sort((a: any, b: any) => {
        const diaA = a.fecha.match(/^(LU|MA|MI|JU|VI|SA|DO)#/);
        const diaB = b.fecha.match(/^(LU|MA|MI|JU|VI|SA|DO)#/);

        if (diaA && !diaB) return -1;
        if (!diaA && diaB) return 1;

        if (diaA && diaB) {
          const orden = ordenDias[diaA[1]] - ordenDias[diaB[1]];

          if (orden !== 0) return orden;

          return a.fecha.localeCompare(b.fecha);
        }

        return a.fecha.localeCompare(b.fecha);
      })
      .map((actual: any, indice: number) => ({
        ...actual,
        numero: indice + 1
      }));

    this.formulario.markAsDirty();
  }

  public eliminarEvento(evento: any): void {
    this.dialogoServicio.abrir({
      referencia: DialogoConfirmacion,
      titulo: 'Eliminar evento',
      icono: 'delete',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: 'Eliminar evento',
        mensaje: `¿Está seguro de eliminar el evento "${evento.fecha}" ? `,
        textoSi: 'Eliminar',
        textoNo: 'Cancelar'
      },
      datos: evento,
      alFinalizar: (respuesta: any) => {
        if (respuesta?.resultado !== true) {
          return;
        }

        this.eventos = this.eventos.filter(
          actual => actual !== evento
        );

        this.formulario.markAsDirty();
      }
    });
  }

}