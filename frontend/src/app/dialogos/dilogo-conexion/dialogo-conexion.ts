import { Component, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Notificador } from '../../recursos/notificador';
import { Formulario } from '../../recursos/dialogo.formulario';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { DialogoCaptura } from '../dialogo-captura/dialogo-captura';
import { DialogoResolucion } from '../dialogo-resolucion/dialogo-resolucion';

@Component({
  selector: 'dialogo-validacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dialogo-conexion.html',
})
export class DialogoConexion extends Formulario {

  private notificador = inject(Notificador);
  private dialogoServicio = inject(DialogoServicio)

  public estaConectado = false;

  public nombre?: string;

  private dispositivo?: any;
  private servidor?: any;
  private servicio?: any;
  private caracteristica?: any;

  public tienePin: boolean | undefined = undefined;
  public pinValidado = false;
  public pin: string | undefined = undefined

  public formulario = new FormGroup({
    nombreRed: new FormControl('', Validators.required),
    contrasenaRed: new FormControl('', Validators.required),
  });

  override cargar(): void {
    this.buscar().catch((error) => {
      console.error('ERROR BLE:', error);
    });
  }

  public async buscar(): Promise<void> {

    try {

      // Verificar soporte de Web Bluetooth
      if (!navigator.bluetooth) {
        this.notificador.error(
          'Este navegador o dispositivo no soporta Bluetooth. Use Chrome o Edge en un equipo con Bluetooth.'
        );
        this.cerrar();
        return;
      }

      // Verificar que el adaptador Bluetooth esté disponible/encendido
      if (navigator.bluetooth.getAvailability) {
        const disponible = await navigator.bluetooth.getAvailability();
        if (!disponible) {
          this.notificador.error(
            'No se detectó un adaptador Bluetooth. Verifique que el Bluetooth esté encendido en su equipo.'
          );
          this.cerrar();
          return;
        }
      }

      this.nombre = 'SGALA-' + this.datos.tipo + '-' + this.datos.clave.slice(-4);

      const uuidServicio = this.datos.clave.toLowerCase();
      const uuidCaracteristica = '12345678-1234-5678-1234-56789abcdef0';

      // ==========================================================
      // BUSCAR DISPOSITIVO
      // ==========================================================

      this.dispositivo =
        await navigator.bluetooth.requestDevice({
          filters: [
            {
              name: this.nombre
            }
          ],
          optionalServices: [
            uuidServicio
          ]
        });

      // ==========================================================
      // EVENTO DE DESCONEXIÓN
      // ==========================================================

      this.dispositivo.addEventListener(
        'gattserverdisconnected',
        () => {
          this.estaConectado = false;
        }
      );

      // ==========================================================
      // VALIDAR GATT
      // ==========================================================

      if (!this.dispositivo.gatt) {
        throw new Error(
          'El dispositivo no soporta GATT'
        );
      }

      this.servidor = await this.dispositivo.gatt.connect();
      this.servicio = await this.servidor.getPrimaryService(uuidServicio);
      this.caracteristica = await this.servicio.getCharacteristic(uuidCaracteristica);

      await this.caracteristica.startNotifications();
      this.caracteristica.addEventListener('characteristicvaluechanged', this.recibirRespuesta.bind(this));

      this.estaConectado = true;
      this.consultarPin()

    } catch (error: any) {

      const nombre = error?.name;
      const mensaje = error?.message ?? '';

      if (nombre === 'NotFoundError' && mensaje.toLowerCase().includes('cancel')) {
        // El usuario cerró la ventana de selección BLE
        this.notificador.advertencia('Vinculación cancelada.');
      } else if (nombre === 'NotFoundError') {
        // No se encontró el dispositivo o no hay Bluetooth disponible
        this.notificador.error(
          'No se encontró el dispositivo. Verifique que el Bluetooth esté encendido y el dispositivo cerca.'
        );
      } else if (nombre === 'SecurityError') {
        this.notificador.error(
          'El acceso a Bluetooth fue bloqueado. Verifique los permisos del navegador.'
        );
      } else if (nombre === 'NotSupportedError') {
        this.notificador.error(
          'Este equipo o navegador no soporta Bluetooth.'
        );
      } else if (nombre === 'NetworkError') {
        this.notificador.error(
          'No fue posible conectar con el dispositivo. Intente nuevamente.'
        );
      } else {
        this.notificador.error(
          mensaje || 'Ocurrió un error al vincular el dispositivo.'
        );
      }

      this.estaConectado = false;
      this.cerrar();
    }
  }

  private async enviarOperacion(operacion: string, datos?: any): Promise<void> {

    if (!this.caracteristica) {
      return;
    }

    const solicitud = {
      operacion,
      ...datos
    };

    const mensaje =
      JSON.stringify(
        solicitud
      );

    console.log(mensaje)

    const bytes =
      new TextEncoder().encode(
        mensaje
      );

    await this.caracteristica.writeValue(
      bytes
    );
  }

  private async consultarPin(): Promise<void> {
    await this.enviarOperacion(
      'consultar_pin'
    );
  }

  private async consultarDatos(): Promise<void> {
    await this.enviarOperacion(
      'consultar_datos',
      { pin: this.pin }
    );
  }

  private recibirRespuesta(evento: Event): void {
    try {

      const caracteristica = evento.target as any;
      if (!caracteristica.value) { return; }
      const texto = new TextDecoder().decode(caracteristica.value);
      const respuesta = JSON.parse(texto);

      if (respuesta.estatus == true) {
        this.notificador.exitoso(
          respuesta.mensaje
        );
      } else {
        throw new Error(respuesta.mensaje)
      }

      // ========================================================
      // CONSULTAR PIN
      // ========================================================
      if (respuesta.operacion === 'consultar_pin') {
        this.tienePin = respuesta.datos
        if (this.tienePin == true) {
          this.capturarPin()
        } else {
          this.capturarNuevoPin(false)
        }
      }

      // ========================================================
      // CONSULTAR DATOS
      // ========================================================

      if (respuesta.operacion === 'consultar_datos') {
        this.formulario.controls['nombreRed'].setValue(respuesta.datos.nombreRed);
        this.formulario.controls['contrasenaRed'].setValue(respuesta.datos.contrasenaRed);
        return;
      }

      // ========================================================
      // VERIFICAR PIN
      // ========================================================

      if (respuesta.operacion === 'verificar_pin') {
        if (respuesta.datos == true) {
          this.pinValidado = true
          this.consultarDatos()
        }
        else {
          this.notificador.advertencia("El pin es incorrecto vueva a capturar.")
          this.capturarPin()
        }
      }

      // // ========================================================
      // ERROR
      // ========================================================

      if (respuesta.operacion === 'error') {
        throw new Error(respuesta.mensaje)
      }

    } catch (error: any) {
      this.notificador.error(error);
    }

  }

  public async verificar(): Promise<void> {

    if (!this.caracteristica) {
      return;
    }

    const datos = {
      pin: this.pin,
      datos: this.formulario.getRawValue()
    };

    await this.enviarOperacion(
      'actualizar_datos',
      datos
    );
  }

  public capturarPin() {
    this.dialogoServicio.abrir({
      referencia: DialogoCaptura,
      titulo: 'Capturar pin actual',
      icono: 'input',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Pin del dispositivo",
        cuerpo: "Introduce el PIN del dispositivo: 6 números.",
        entrada: { tipo: 'contraseña', validaciones: [Validators.required], etiqueta: 'Pín', mascara: "000000" }
      },
      alFinalizar: this.finalizarCapturaPin.bind(this)
    });
  }

  public async finalizarCapturaPin(respuesta: any) {
    if (respuesta.resultado != undefined) {
      this.pin = respuesta.resultado
      const datos = {
        pin: this.pin
      }
      await this.enviarOperacion(
        'verificar_pin',
        datos
      );
    }
  }

  public capturarNuevoPin(tienePin: boolean) {
    this.dialogoServicio.abrir({
      referencia: DialogoResolucion,
      titulo:
        tienePin == true
          ? 'Actualizar a un nuevo PIN'
          : 'Crear un nuevo PIN',
      icono: 'input',
      largo: 'l25%,m45%,c100%',
      desactivarAutocerrado: true,
      parametros: {
        titulo: "Pin para el dispositivo",
        cuerpo:
          tienePin == true
            ? "Introduce el nuevo PIN que deseas asignar al dispositivo."
            : "Introduce el PIN que deseas asignar al dispositivo."
      },
      alFinalizar: this.finalizarCapturarNuevoPin.bind(this)
    });
  }

  public async finalizarCapturarNuevoPin(respuesta: any) {
    if (respuesta.resultado != undefined) {
      this.pin = respuesta.resultado
      await this.enviarOperacion(
        'actualizar_pin',
        {
          pinActual: this.pin,
          pinNuevo: respuesta.resultado
        }
      );
    }
  }
}