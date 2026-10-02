import { Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { ServicioDispositivo } from '../../servicios/servicio-dispositivo';
import { Notificador } from '../../recursos/notificador';
import { Formulario } from '../../recursos/dialogo.formulario';

export interface ValidarClaveData {
  tipo: 'U' | 'D';
}

/** Expresión UUID usada para validar la clave leída del QR. */
const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  ],
  templateUrl: './dialogo-validacion.html',
  styles: [`
    .contenedor-qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .video-qr {
      width: 100%;
      max-width: 320px;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: 12px;
      background: #000;
    }

    .texto-qr {
      margin: 0;
      text-align: center;
      font-size: 14px;
      color: #616161;
    }
  `],
})
export class DialogoValidacion extends Formulario implements OnDestroy {

  private servicioUsuario = inject(ServicioUsuario);
  private servicioDispositivo = inject(ServicioDispositivo);
  private notificador = inject(Notificador);

  @ViewChild('video') private videoRef?: ElementRef<HTMLVideoElement>;

  /** Indica si el escáner de cámara está activo. */
  public escaneando = signal(false);

  private stream: MediaStream | null = null;
  private deteccionActiva = false;
  private detector: any = null;

  public formulario = new FormGroup({
    clave: new FormControl('', [
      Validators.required,
      Validators.pattern(PATRON_UUID)
    ]),
  });

  override ngOnDestroy(): void {
    this.detenerEscaneo();
    super.ngOnDestroy();
  }

  /**
   * Inicia el escaneo de QR: pide permiso de cámara, muestra el video
   * y comienza a detectar códigos QR.
   */
  async escanearQR(): Promise<void> {

    // Verificar soporte de la API de detección de códigos.
    if (!('BarcodeDetector' in window)) {
      this.notificador.error(
        'Tu navegador no permite leer códigos QR. Ingresa la clave manualmente.'
      );
      return;
    }

    // Diagnóstico: confirmar que el motor soporta el formato QR.
    try {
      const formatos: string[] =
        await (window as any).BarcodeDetector.getSupportedFormats();
      console.log('🔎 Formatos de código soportados:', formatos);

      if (!formatos.includes('qr_code')) {
        this.notificador.error(
          'Tu navegador no puede detectar códigos QR. Ingresa la clave manualmente.'
        );
        return;
      }
    } catch {
      // Si getSupportedFormats no existe, continuamos e intentamos igual.
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.notificador.error(
        'No se puede acceder a la cámara en este navegador.'
      );
      return;
    }

    try {

      // Pedir permiso y abrir la cámara trasera si está disponible.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      this.escaneando.set(true);

      // Esperar a que la vista renderice el <video> y asignar el stream.
      setTimeout(() => this.iniciarVideo(), 0);

    } catch (error: any) {

      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        this.notificador.error(
          'Permiso de cámara denegado. Habilítalo para leer el QR.'
        );
      } else if (error?.name === 'NotFoundError') {
        this.notificador.error(
          'No se encontró ninguna cámara en el dispositivo.'
        );
      } else {
        this.notificador.error(
          'No se pudo iniciar la cámara.'
        );
      }

      this.detenerEscaneo();
    }
  }

  private async iniciarVideo(): Promise<void> {

    const video = this.videoRef?.nativeElement;

    if (!video || !this.stream) {
      this.detenerEscaneo();
      return;
    }

    video.srcObject = this.stream;
    await video.play().catch(() => { });

    // @ts-ignore - BarcodeDetector es una API del navegador.
    this.detector = new (window as any).BarcodeDetector({
      formats: ['qr_code']
    });

    this.deteccionActiva = true;
    this.detectarEnBucle(video);
  }

  private async detectarEnBucle(video: HTMLVideoElement): Promise<void> {

    if (!this.deteccionActiva) {
      return;
    }

    try {

      const codigos = await this.detector.detect(video);

      if (codigos && codigos.length > 0) {
        const valor = (codigos[0].rawValue || '').trim();
        this.procesarCodigo(valor);
        return;
      }

    } catch {
      // Ignorar errores puntuales de detección y seguir intentando.
    }

    requestAnimationFrame(() => this.detectarEnBucle(video));
  }

  /**
   * Procesa el valor leído del QR: valida que sea un UUID,
   * lo coloca en el formulario y lanza la verificación.
   */
  private procesarCodigo(valor: string): void {

    if (!PATRON_UUID.test(valor)) {
      this.notificador.error(
        'El código QR no contiene una clave válida.'
      );
      // Seguir escaneando por si hay otro código.
      if (this.videoRef?.nativeElement && this.deteccionActiva) {
        requestAnimationFrame(() =>
          this.detectarEnBucle(this.videoRef!.nativeElement)
        );
      }
      return;
    }

    this.formulario.patchValue({ clave: valor });
    this.detenerEscaneo();
    this.notificador.exitoso('Clave leída del código QR.');
    this.verificar();
  }

  /** Detiene la cámara y el bucle de detección. */
  detenerEscaneo(): void {

    this.deteccionActiva = false;

    if (this.stream) {
      this.stream.getTracks().forEach(pista => pista.stop());
      this.stream = null;
    }

    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }

    this.detector = null;
    this.escaneando.set(false);
  }

  verificar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const clave = this.formulario.getRawValue().clave!;

    const peticion = this.parametros === 'U'
      ? this.servicioUsuario.validarClave(clave)
      : this.servicioDispositivo.validarClave(clave);

    peticion.subscribe({
      next: (respuesta) => {
        if (respuesta.estatus === 200) {
          this.notificador.exitoso(
            "Clave validada exitosamente."
          );
          this.cerrar(clave);
        }
        if (respuesta.estatus === 202) {
          this.cerrar(undefined);
          throw new Error(respuesta.mensaje)
        }
      }
    });
  }
}