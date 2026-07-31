import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { MatSelectModule } from '@angular/material/select';
import { Notificador, } from '../../recursos/notificador';

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
  templateUrl: './dialogo-ayuda.html',
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
export class DialogoAyuda {
  private http = inject(HttpClient);
  private notificador = inject(Notificador);
  private dialogRef = inject(MatDialogRef<DialogoAyuda>);


  formulario = new FormGroup({
    descripcion: new FormControl('', [
      Validators.required,
      Validators.maxLength(1000)
    ]),
    pregunta: new FormControl('', [
      Validators.required
    ]),
    medioContacto: new FormControl('', [
      Validators.maxLength(50)
    ]),
  });

  constructor() {

    this.formulario.get('pregunta')?.valueChanges.subscribe(valor => {

      const medioContacto = this.formulario.get('medioContacto');

      medioContacto?.clearValidators();

      switch (valor) {

        case 'correo':
          medioContacto?.setValidators([
            Validators.required,
            Validators.maxLength(100),
            Validators.email
          ]);
          break;

        case 'telefono':
          medioContacto?.setValidators([
            Validators.required,
            Validators.pattern(/^[0-9]{10}$/)
          ]);
          break;

        case 'no':
          medioContacto?.setValidators([
            Validators.maxLength(50)
          ]);
          break;

      }

      medioContacto?.updateValueAndValidity();

    });
  }

  enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();

    this.http.post(`${environment.apiUrl}solicitudes/crear`, datos).subscribe({
      next: () => {
        this.notificador.exitoso('Solicitud enviada. Gracias por contactarnos.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        throw new Error(error)
      },
    });
  }
}
