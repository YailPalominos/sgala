import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { UsuarioServicio } from '../../servicios/usuario.servicio';
import { SeleccionDialogComponent } from '../seleccion/seleccion.dialog';

@Component({
  selector: 'app-recuperacion-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Recuperar contraseña</h2>

    <mat-dialog-content>
  <p> Ingresa tu alias, número de teléfono o correo electrónico para validar tu identidad. Si la información es correcta, te enviaremos un enlace para restablecer tu contraseña a tu correo electrónico o número de teléfono registrado. </p>

      <form [formGroup]="formulario" (ngSubmit)="verificar()" id="form-recuperacion">
        <mat-form-field appearance="outline">
          <mat-label>Identificador</mat-label>
          <input matInput formControlName="identificador" placeholder="alias, correo o teléfono" />
          <mat-icon matPrefix>person</mat-icon>
          @if (formulario.get('identificador')?.hasError('required')) {
            <mat-error>El identificador es requerido.</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" type="submit" form="form-recuperacion">
        Verificar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 350px;
    }

    mat-dialog-content form {
      display: flex;
      flex-direction: column;
    }

    mat-form-field {
      width: 100%;
    }

    p {
      color: #666;
      margin-bottom: 16px;
    }
  `],
})
export class RecuperacionDialog {
  private usuarioServicio = inject(UsuarioServicio);
  private notificadorServicio = inject(NotificadorServicio);
  private cargadorServicio = inject(CargadorServicio);
  private matDialog = inject(MatDialog)
  private dialogoReferencia = inject(MatDialogRef<RecuperacionDialog>);

  formulario = new FormGroup({
    identificador: new FormControl('', [Validators.required]),
  });

  verificar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargadorServicio.mostrar();
    const identificador = this.formulario.getRawValue().identificador!;
    this.usuarioServicio.verificarIdentidad(identificador).subscribe({
      next: (respuesta) => {
        this.cargadorServicio.ocultar();
        this.notificadorServicio.exitoso("Identidad verificada exitosamente.")
        this.matDialog.open(SeleccionDialogComponent, {
          data: {
            titulo: 'Selecciona',
            mensaje: 'Como quieres que te llegue el enlace de recuperación para restablecer tu contraseña.',
            requerido: true,
            opciones: [
              { clave: 'C', texto: 'Correo electronico (' + respuesta.datos.direccionCorreoElectronico + ')' },
              { clave: 'C', texto: 'Teléfono (' + respuesta.datos.telefono + ')' },
            ]
          }
        }).afterClosed().subscribe((clave: any) => {
          if (clave) {
            this.enviar(identificador, clave)
          }
        });
      },
      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
    });
  }


  enviar(identificador: string, tipo: string) {
    this.cargadorServicio.mostrar();
    this.usuarioServicio.solicitarRecuperacion(identificador, tipo).subscribe({
      next: () => {
        this.cargadorServicio.ocultar();
        this.notificadorServicio.exitoso("Se ha enviado en enlace para restablecer tu contraseña.")
        this.dialogoReferencia.close();
      },
      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
    });
  }

}
