import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';

@Component({
  selector: 'app-recuperacion-solicitud',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './recuperacion-solicitud.component.html',
})
export class RecuperacionSolicitudComponent {
  private authService = inject(AutenticacionServicio);

  formulario = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
  });

  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);
  cargando = signal(false);

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);

    const correo = this.formulario.getRawValue().correo!;

    this.authService.solicitarRecuperacion(correo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mensajeExito.set(
          'Si el correo existe en el sistema, se ha enviado un enlace de recuperación.'
        );
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.status === 0) {
          this.mensajeError.set('No se pudo establecer conexión con el servidor.');
        } else {
          this.mensajeError.set('Ocurrió un error inesperado.');
        }
      },
    });
  }
}
