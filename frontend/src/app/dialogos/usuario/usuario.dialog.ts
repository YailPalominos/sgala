import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { MatTooltip } from "@angular/material/tooltip";
import { UsuarioServicio } from '../../servicios/usuario.servicio';
import { ConfirmacionDialogComponent } from '../confirmacion/confirmacion.dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agregar-dispositivo-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltip
  ],
  template: `
    <h2 mat-dialog-title class="titulo">
     {{ data.accion=='R'?'Nuevo usuario':(data?.datos.alias )}}
    </h2>

    <mat-dialog-content>

        <p class="descripcion">
          {{
            data.accion === 'R'
              ? 'Completa la información para crear un nuevo usuario.'
              : 'Edita la información del usuario.'
          }}
        </p>
        <form [formGroup]="formulario" (ngSubmit)="preparar()" id="form-datos">

         <mat-form-field appearance="outline">
            <mat-label>Alias</mat-label>
            <input matInput formControlName="alias" type="tel" autocomplete="tel" />
            <mat-icon matPrefix>badge</mat-icon>
            <mat-hint>
                Solo letras y números. Máximo 15 caracteres.
            </mat-hint>

            @if (formulario.controls.alias.hasError('required')) {
              <mat-error>
                El alias es obligatorio.
              </mat-error>
            }

            @if (formulario.controls.alias.hasError('maxlength')) {
              <mat-error>
                El alias no puede tener más de 15 caracteres.
              </mat-error>
            }

            @if (formulario.controls.alias.hasError('pattern')) {
              <mat-error>
                El alias solo puede contener letras y números.
              </mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Dirección de correo electronico</mat-label>
            <input matInput formControlName="direccionCorreoElectronico" autocomplete="off" />
            <mat-icon matPrefix>email</mat-icon>

            @if (formulario.controls.direccionCorreoElectronico.hasError('required')) {
              <mat-error>
                La dirección de correo electrónico es obligatoria.
              </mat-error>
            }

            @if (formulario.controls.direccionCorreoElectronico.hasError('email')) {
              <mat-error>
                Ingresa una dirección de correo electrónico válida.
              </mat-error>
            }

          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono" autocomplete="off" />
            <mat-icon matPrefix>phone</mat-icon>

              @if (formulario.controls.telefono.hasError('required')) {
                <mat-error>
                  El número de teléfono es obligatorio.
                </mat-error>
              }

              @if (formulario.controls.telefono.hasError('pattern')) {
                <mat-error>
                  Ingresa un número de teléfono válido de 10 dígitos.
                </mat-error>
              }
              
          </mat-form-field>

        </form>
      
    </mat-dialog-content>

    <mat-dialog-actions align="center">

    @if(data.accion=='A'){
        <button mat-raised-button color="primary" type="buttom" style="background-color:#0059b6; color:white"
        (click)="restablecer()"
        matTooltip="Cambiar de contraseña"
        >
          Restablecer
        </button>
    }
      <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" form="form-datos">
          {{ data.accion=='R'?'Crear':'Actualizar'}}
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
      min-width: 350px;
    }

    mat-form-field {
      margin-bottom: 10px;
      width: 100%;
    }
  `],
})
export class UsuarioDialog {
  private autenticacionServicio = inject(AutenticacionServicio);
  private usuarioServicio = inject(UsuarioServicio)
  private notificadorServicio = inject(NotificadorServicio);
  private cargador = inject(CargadorServicio);
  private dialogRef = inject(MatDialogRef<UsuarioDialog>);

  private dialog = inject(MatDialog);
  private router = inject(Router);

  public formulario = new FormGroup({
    alias: new FormControl('', [
      Validators.required,
      Validators.maxLength(15),
      Validators.pattern(/^[a-zA-Z0-9]+$/)
    ]),
    direccionCorreoElectronico: new FormControl('', [Validators.required, Validators.email]),
    telefono: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
  });

  protected data = inject<any>(MAT_DIALOG_DATA);

  private ngOnInit() {
    if (this.data.accion == 'A') {
      this.formulario.controls['alias'].setValue(this.data.datos.alias ?? '')
      this.formulario.controls['direccionCorreoElectronico'].setValue(this.data.datos.direccionCorreoElectronico ?? '')
      this.formulario.controls['telefono'].setValue(this.data.datos.telefono ?? '')
    }
  }

  public preparar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      throw new Error('El formulario contiene datos inválidos.');
    }

    const datos = this.formulario.getRawValue();

    const esActualizar = this.data.accion == 'A';

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '420px',
      data: {
        titulo: esActualizar ? 'Actualizar usuario' : 'Crear usuario',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el usuario? La sesión actual deberá cerrarse.'
          : '¿Está seguro de crear este usuario?',
        textoSi: 'Sí',
        textoNo: 'No'
      }
    });

    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta != undefined) {
        if (esActualizar) {
          this.actualizar(datos);
        } else {
          this.crear(datos);
        }
      }
    });
  }

  public actualizar(datos: any): void {
    this.cargador.mostrar();
    this.usuarioServicio.actualizar(datos).subscribe({
      next: () => {
        this.notificadorServicio.exitoso("Usuario actualizdo exitosamente.")
        this.cargador.ocultar();
        this.dialogRef.close(true)
      },
      error: (error) => {
        this.cargador.ocultar();
        throw new Error(error)
      },
    });
  }

  public crear(datos: any): void {
    this.cargador.mostrar();

    const datosCrear = {
      ...datos,
      clave: this.data.datos.clave
    };

    this.usuarioServicio.crear(datosCrear).subscribe({
      next: () => {
        this.notificadorServicio.exitoso("Usuario creado exitosamente.")
        this.cargador.ocultar();
        this.dialogRef.close(true)
      },
      error: (error) => {
        this.cargador.ocultar();
        throw new Error(error)
      },
    });
  }

  public restablecer() {

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '420px',
      data: {
        titulo: 'Cambiar la contraseña',
        mensaje: '¿Estas seguro de cambiar la contraseña?',
        textoSi: 'Si',
        textoNo: 'No'
      }
    });

    dialogRef.afterClosed().subscribe((respuesta: boolean | undefined) => {
      if (respuesta == true) {
        this.solicitarLlave();
      }
    });
  }


  public solicitarLlave() {
    this.usuarioServicio.solicitarLlaveRecuperacion().subscribe({
      next: (respuesta) => {
        this.cargador.ocultar();

        this.autenticacionServicio.eliminarSesion()

        this.router.navigate(['/restablecer'], {
          queryParams: {
            clave: respuesta.datos.claveLlaveRecuperacion
          }
        });

        this.dialogRef.close(false)
      },
      error: (error) => {
        this.cargador.ocultar();
        throw new Error(error)
      },
    });
  }
}
