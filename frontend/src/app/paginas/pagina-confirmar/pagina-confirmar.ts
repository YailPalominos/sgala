import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Autenticador } from '../../recursos/autenticador';
import { ServicioUsuario } from '../../servicios/servicio-usuario';
import { Notificador } from '../../recursos/notificador';

@Component({
  selector: 'app-pagina-confirmar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './pagina-confirmar.html',
  styleUrl: './pagina-confirmar.scss',
})
export class PaginaConfirmar implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private autenticador = inject(Autenticador);
  private notificador = inject(Notificador);
  private servicioUsuario = inject(ServicioUsuario);

  public tipo?: 'usuario' | 'correo' | 'telefono'

  public codigo = new FormControl('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    )
  ]);

  public datos: any = null;

  ngOnInit(): void {

    this.autenticador.eliminarSesionSinNavegar();

    this.route.queryParamMap.subscribe(parametros => {

      const tipo = parametros.get('tipo');

      if (
        tipo === 'usuario' ||
        tipo === 'correo' ||
        tipo === 'telefono'
      ) {
        this.tipo = tipo;
      }

      const codigo = parametros.get('codigoVerificacion');

      if (codigo) {
        this.codigo.setValue(codigo);
        this.verificar();
      }
    });
  }

  public async verificar(): Promise<void> {
    const codigo = this.codigo.value as string;

    if (!this.tipo) {
      throw new Error('El tipo de verificación no está definido.');
    }

    this.servicioUsuario.verificarCodigo(codigo, this.tipo).subscribe({
      next: (respuesta) => {
        this.datos = respuesta.datos;
      }
    });
  }

  public confirmar(): void {
    if (!this.tipo) {
      throw new Error('El tipo de verificación no está definido.');
    }
    const codigo = this.codigo.value as string
    this.servicioUsuario.confirmarCodigo(codigo, this.tipo).subscribe({
      next: () => {
        this.notificador.informacion(
          'Confirmación realizada correctamente. Se ha enviado una contraseña provisional a su correo electrónico para que pueda iniciar sesión.'
        );
        this.router.navigate(['/acceder']);
      }
    })
  }

}