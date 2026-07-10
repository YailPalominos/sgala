import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';

@Component({
  selector: 'app-recuperacion-cambio',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './recuperacion-cambio.component.html',
})
export class RecuperacionCambioComponent {
  private authService = inject(AutenticacionServicio);
  private router = inject(Router);

  formulario = new FormGroup({
    llave: new FormControl('', [Validators.required]),
    nuevaContrasena: new FormControl('', [Validators.required]),
  });

  mensajeError = signal<string | null>(null);
  cargando = signal(false);

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const datos = this.formulario.getRawValue() as { llave: string; nuevaContrasena: string };

    this.authService.cambiarContrasena(datos).subscribe({
      next: () => {
        this.router.navigate(['/login'], {
          queryParams: { contrasenaActualizada: 'true' },
        });
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.status === 400) {
          this.mensajeError.set('La llave de recuperación es inválida o ha expirado.');
        } else if (err.status === 0) {
          this.mensajeError.set('No se pudo establecer conexión con el servidor.');
        } else {
          this.mensajeError.set('Ocurrió un error inesperado.');
        }
      },
    });
  }
}
