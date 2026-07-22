import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { DispositivoServicio } from '../../servicios/dispositivo.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { ConfirmacionDialogComponent } from '../confirmacion/confirmacion.dialog';


@Component({
  selector: 'app-editar-dispositivo-dialog',
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
    <h2 mat-dialog-title class="titulo">
     {{ data.accion=='R'?'Nuevo dispositivo':(data?.datos.alias )}}
    </h2>
    <p class="descripcion">
          {{
            data.accion === 'R'
              ? 'Completa la información para crear un nuevo dispositivo.'
              : 'Edita la información del dispositivo.'
          }}
    </p>
    <mat-dialog-content>
      <form [formGroup]="formulario" (ngSubmit)="preparar()" id="form-editar">

        <mat-form-field appearance="outline">
          <mat-label>Alias</mat-label>
          <input matInput formControlName="alias" />
          <mat-icon matPrefix>label</mat-icon>

            @if (formulario.get('alias')?.hasError('required')) {
              <mat-error>
                El alias es requerido.
              </mat-error>
            }

            @if (formulario.get('alias')?.hasError('maxlength')) {
              <mat-error>
                El alias no puede superar los 15 caracteres.
              </mat-error>
            }
            
          </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" type="tel" />
          <mat-icon matPrefix>phone</mat-icon>

            @if (formulario.get('telefono')?.hasError('required')) {
              <mat-error>
                El teléfono es obligatorio
              </mat-error>
            }

            @if (formulario.get('telefono')?.hasError('pattern')) {
              <mat-error>
                El teléfono debe contener exactamente 10 números
              </mat-error>
            }

        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="center">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" type="submit" form="form-editar">
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
      min-width: 320px;
      padding: 10px;
    }

    mat-form-field {
      width: 100%;
    }
  `],
})
export class DialogoDispositivo {
  private dialogRef = inject(MatDialogRef<DialogoDispositivo>);
  public data: any = inject(MAT_DIALOG_DATA);
  private notificadorServicio = inject(NotificadorServicio);
  private dispositivoServicio = inject(DispositivoServicio);
  private cargadorServicio = inject(CargadorServicio);
  private dialog = inject(MatDialog);

  formulario = new FormGroup({
    clave: new FormControl(''),
    alias: new FormControl('', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z0-9]+$/)
    ]),

    telefono: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[0-9]{10}$/)
    ]),
  });

  private ngOnInit() {
    if (this.data.accion == 'A') {
      this.formulario.patchValue(this.data.datos)
    }
  }

  preparar(): void {

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      throw new Error('El formulario contiene datos inválidos.');
    }

    const datos = this.formulario.getRawValue();

    const esActualizar = this.data.accion == 'A';

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '420px',
      data: {
        titulo: esActualizar ? 'Actualizar dispositivo' : 'Crear dispositivo',
        mensaje: esActualizar
          ? '¿Está seguro de actualizar el dispositivo?'
          : '¿Está seguro de crear este dispositivo?',
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

  public crear(datos: any): void {
    this.cargadorServicio.mostrar();
    this.dispositivoServicio.crear(datos).subscribe({
      next: () => {
        this.notificadorServicio.exitoso("Dispositivo creado exitosamente.")
        this.cargadorServicio.ocultar();
        this.dialogRef.close();
      },
      error: (error) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
    });
  }


  public actualizar(datos: any): void {
    this.cargadorServicio.mostrar();
    this.dispositivoServicio.actualizar(datos).subscribe({
      next: () => {
        this.notificadorServicio.exitoso("Dispositivo actualizado exitosamente.")
        this.cargadorServicio.ocultar();
        this.dialogRef.close();
      },
      error: (error) => {
        this.cargadorServicio.ocultar();
        throw new Error(error)
      },
    });
  }
}
