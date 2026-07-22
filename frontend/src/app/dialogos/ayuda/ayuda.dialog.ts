import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { environment } from '../../../environments/environment';
import { NotificadorServicio } from '../../servicios/notificador.servicio';
import { CargadorServicio } from '../../servicios/cargador.servicio';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-ayuda-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title class="titulo">Ayuda o contacto</h2>

    <mat-dialog-content>
      <p class="descripcion">
        Escribe tu solicitud. Puedes dejar tus datos de contacto para que podamos atenderte.
      </p>

      <form [formGroup]="formulario" (ngSubmit)="enviar()" id="form-ayuda">
        <mat-form-field appearance="outline">
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            formControlName="descripcion"
            rows="5"
            maxlength="1000"
            placeholder="Describe tu problema o consulta..."
          ></textarea>
          <mat-hint align="end">{{ formulario.get('descripcion')?.value?.length || 0 }}/1000</mat-hint>
          @if (formulario.get('descripcion')?.hasError('required')) {
            <mat-error>La descripción es requerida.</mat-error>
          }
        </mat-form-field>


        <mat-form-field appearance="outline">
  <mat-label>¿Cómo podemos contactarte?</mat-label>
  <mat-select [(value)]="medioContacto">
    <mat-option value="correo">
      <mat-icon>email</mat-icon>
      Correo electrónico
    </mat-option>

    <mat-option value="telefono">
      <mat-icon>phone</mat-icon>
      Teléfono
    </mat-option>
  </mat-select>
  <mat-icon matPrefix>contact_mail</mat-icon>
</mat-form-field>

@if (medioContacto === 'correo') {
  <mat-form-field appearance="outline">
    <mat-label>Correo electrónico</mat-label>
    <input
      matInput
      type="email"
      formControlName="medioContacto" />
    <mat-icon matPrefix>email</mat-icon>
  </mat-form-field>
}

@if (medioContacto === 'telefono') {
  <mat-form-field appearance="outline">
    <mat-label>Teléfono</mat-label>
    <input
      matInput
      type="tel"
      formControlName="medioContacto" />
    <mat-icon matPrefix>phone</mat-icon>
  </mat-form-field>
}

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" type="submit" form="form-ayuda">
        Enviar solicitud
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
      gap: 4px;
      min-width: 380px;
    }

    mat-form-field {
      width: 100%;
    }
  `],
})
export class AyudaDialog {
  private http = inject(HttpClient);
  private notificador = inject(NotificadorServicio);
  private cargador = inject(CargadorServicio);
  private dialogRef = inject(MatDialogRef<AyudaDialog>);

  medioContacto: 'correo' | 'telefono' | null = null;

  formulario = new FormGroup({
    descripcion: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
    medioContacto: new FormControl('', [Validators.required, Validators.maxLength(50)]),
  });

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargador.mostrar();

    const datos = this.formulario.getRawValue();

    this.http.post(`${environment.apiUrl}/api/solicitudes`, datos).subscribe({
      next: () => {
        this.cargador.ocultar();
        this.notificador.exitoso('Solicitud enviada. Gracias por contactarnos.');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.cargador.ocultar();
        if (err.status === 0) {
          this.notificador.error('No se pudo establecer conexión con el servidor.');
        } else {
          this.notificador.error('Ocurrió un error al enviar la solicitud.');
        }
      },
    });
  }
}
