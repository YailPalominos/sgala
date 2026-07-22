import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { UsuarioServicio } from '../../servicios/usuario.servicio';

export interface ReglasContrasena {
  minimo8: boolean;
  mayuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean;
  coinciden: boolean;
}

@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './restablecer.component.html',
  styleUrl: './restablecer.component.scss',
})
export class RestablecerComponent implements OnInit, OnDestroy {
  private usuarioServicio = inject(UsuarioServicio);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificador = inject(NotificadorServicio);
  private cargador = inject(CargadorServicio);
  private suscripciones: Subscription[] = [];

  formulario = new FormGroup({
    llave: new FormControl('', [Validators.required]),
    contrasena: new FormControl('', [Validators.required]),
    confirmarContrasena: new FormControl('', [Validators.required]),
  });

  ocultarContrasena = signal(true);
  ocultarConfirmacion = signal(true);
  reglas = signal<ReglasContrasena>({
    minimo8: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false,
    coinciden: false,
  });
  contrasenaSegura = signal(false);

  ngOnInit(): void {
    // Prellenar la llave si viene por query param
    const llave = this.route.snapshot.queryParamMap.get('llave');
    if (llave) {
      this.formulario.get('llave')!.setValue(llave);
    }

    // Suscribirse a cambios de contraseña
    const subContrasena = this.formulario.get('contrasena')!.valueChanges.subscribe(() => {
      this.evaluarReglas();
    });

    const subConfirmar = this.formulario.get('confirmarContrasena')!.valueChanges.subscribe(() => {
      this.evaluarReglas();
    });

    this.suscripciones.push(subContrasena, subConfirmar);
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }

  private evaluarReglas(): void {
    const contrasena = this.formulario.get('contrasena')!.value || '';
    const confirmar = this.formulario.get('confirmarContrasena')!.value || '';

    const reglas: ReglasContrasena = {
      minimo8: contrasena.length >= 8,
      mayuscula: /[A-Z]/.test(contrasena),
      minuscula: /[a-z]/.test(contrasena),
      numero: /[0-9]/.test(contrasena),
      especial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(contrasena),
      coinciden: contrasena.length > 0 && contrasena === confirmar,
    };

    this.reglas.set(reglas);
    this.contrasenaSegura.set(
      reglas.minimo8 && reglas.mayuscula && reglas.minuscula &&
      reglas.numero && reglas.especial && reglas.coinciden
    );
  }

  enviar(): void {
    if (this.formulario.invalid || !this.contrasenaSegura()) {
      this.formulario.markAllAsTouched();
      if (!this.contrasenaSegura()) {
        this.notificador.error('La contraseña no cumple con los requisitos de seguridad.');
      }
      return;
    }

    this.cargador.mostrar();

    const datos = {
      llave: this.formulario.getRawValue().llave!,
      nuevaContrasena: this.formulario.getRawValue().contrasena!,
    };

    this.usuarioServicio.cambiarContrasena(datos).subscribe({
      next: () => {
        this.cargador.ocultar();
        this.notificador.exitoso('Contraseña actualizada exitosamente.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.cargador.ocultar();
        throw new Error(error);
      },
    });
  }
}
