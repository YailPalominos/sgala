import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-captura-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    NgxMaskDirective,
  ],
  templateUrl: './dialogo-captura.html'
})
export class DialogoCaptura extends Dialogo {

  estaOculto: boolean = true
  readonly entrada = new FormControl('');

  override cargar(): void {
    this.entrada.addValidators(this.parametros?.entrada?.validaciones)
  }
  public responder(): void {
    this.cerrar(this.entrada.value)
  }

}