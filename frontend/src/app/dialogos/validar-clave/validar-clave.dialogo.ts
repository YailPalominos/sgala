import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { UsuarioServicio } from '../../servicios/usuario.servicio';
import { DispositivoServicio } from '../../servicios/dispositivo.servicio';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';

export interface ValidarClaveData {
  tipo: 'U' | 'D';
}

@Component({
  selector: 'app-validar-clave-dialog',
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
    <h2 class="titulo">
      Verificar pre {{ data.tipo === 'U' ? 'usuario' : 'dispositivo' }}
    </h2>

    <mat-dialog-content>

      <p class="descripcion">
        Ingresa la clave del pre {{ data.tipo === 'U' ? 'usuario' : 'dispositivo' }}.
        <br>
        Ejemplo: 7f3c2a91-8b64-4d1e-a5f7-2c9e6b8d4a30
      </p>

      <form [formGroup]="formulario" (ngSubmit)="verificar()" id="form-clave">

        <mat-form-field appearance="outline">

          <mat-label>
            Clave del pre {{ data.tipo === 'U' ? 'usuario' : 'dispositivo' }}
          </mat-label>

          <input 
            matInput 
            formControlName="clave" 
            autocomplete="off" />

          <mat-icon matPrefix>key</mat-icon>

          @if (formulario.get('clave')?.hasError('required')) {
            <mat-error>
              La clave es requerida.
            </mat-error>
          }

          @if (formulario.get('clave')?.hasError('pattern')) {
            <mat-error>
              La clave debe tener un formato UUID válido.
            </mat-error>
          }

        </mat-form-field>

      </form>

    </mat-dialog-content>


    <mat-dialog-actions align="center">

      <button mat-button mat-dialog-close>
        Cancelar
      </button>

      <button 
        mat-raised-button 
        color="primary" 
        type="submit" 
        form="form-clave">
        Verificar
      </button>

    </mat-dialog-actions>
  `,
  styles: [`
    .titulo {
      text-align: center;
      font-size: 18px;
    }

    .descripcion {
      color: #666;
      font-size: 14px;
      margin-bottom: 16px;
      text-align: center;
    }

    mat-dialog-content form {
      display: flex;
      flex-direction: column;
      min-width: 320px;
    }

    mat-form-field {
      width: 100%;
    }
  `],
})
export class DialogoValidarClave {

  private usuarioServicio = inject(UsuarioServicio);
  private dispositivoServicio = inject(DispositivoServicio);
  private notificadorServicio = inject(NotificadorServicio);
  private cargadorServicio = inject(CargadorServicio);
  private dialogoReferencia = inject(MatDialogRef<DialogoValidarClave>);

  protected data = inject<ValidarClaveData>(MAT_DIALOG_DATA);

  formulario = new FormGroup({
    clave: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    ]),
  });


  verificar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargadorServicio.mostrar();

    const clave = this.formulario.getRawValue().clave!;


    const peticion = this.data.tipo === 'U'
      ? this.usuarioServicio.validarClave(clave)
      : this.dispositivoServicio.validarClave(clave);


    peticion.subscribe({
      next: (respuesta) => {

        this.cargadorServicio.ocultar();


        if (respuesta.estatus === 200) {

          this.notificadorServicio.exitoso(
            "Clave validada exitosamente."
          );

          this.dialogoReferencia.close(clave);
          return;
        }


        if (respuesta.estatus === 202) {
          this.dialogoReferencia.close(respuesta.datos);
          return;
        }

      },

      error: (error: any) => {
        this.cargadorServicio.ocultar();
        throw error;
      },
    });
  }
}