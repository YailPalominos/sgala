import { Component, inject, signal, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private authService = inject(AutenticacionServicio);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  formulario = new FormGroup({
    alias: new FormControl('', [Validators.required]),
    contrasena: new FormControl('', [Validators.required]),
  });

  mensajeError = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);
  cargando = signal(false);

  ngOnInit(): void {
    const registrado = this.route.snapshot.queryParamMap.get('registrado');
    if (registrado === 'true') {
      this.mensajeExito.set('Registro completado exitosamente. Inicie sesión.');
    }
  }

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const { alias, contrasena } = this.formulario.getRawValue();

    this.authService.login({ alias: alias!, contrasena: contrasena! }).subscribe({
      next: () => {
        this.router.navigate(['/panel']);
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.status === 401) {
          this.mensajeError.set('Credenciales inválidas.');
        } else if (err.status === 0) {
          this.mensajeError.set('No se pudo establecer conexión con el servidor.');
        } else {
          this.mensajeError.set('Ocurrió un error inesperado.');
        }
      },
    });
  }
}
