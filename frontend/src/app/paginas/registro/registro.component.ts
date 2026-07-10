import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './registro.component.html',
})
export class RegistroComponent {
  private authService = inject(AutenticacionServicio);
  private router = inject(Router);

  formulario = new FormGroup({
    uuidPreDispositivo: new FormControl('', [Validators.required]),
    alias: new FormControl('', [Validators.required]),
    correo: new FormControl('', [Validators.required, Validators.email]),
    contrasena: new FormControl('', [Validators.required]),
    telefono: new FormControl('', [Validators.required]),
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

    this.authService.registro(this.formulario.getRawValue() as {
      uuidPreDispositivo: string;
      alias: string;
      correo: string;
      contrasena: string;
      telefono: string;
    }).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registrado: 'true' } });
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.status === 400) {
          this.mensajeError.set(err.error?.error || 'Datos inválidos.');
        } else if (err.status === 409) {
          this.mensajeError.set('El alias o correo electrónico ya están registrados.');
        } else if (err.status === 0) {
          this.mensajeError.set('No se pudo establecer conexión con el servidor.');
        } else {
          this.mensajeError.set('Ocurrió un error inesperado.');
        }
      },
    });
  }
}
