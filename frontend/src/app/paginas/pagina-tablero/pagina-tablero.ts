import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Dispositivo } from '../../interfaces/dispositivo';
import { MatMenuModule } from '@angular/material/menu';
import { Socket } from '../../recursos/socket';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { FormularioDispositivo } from '../../formularios/formulario-dipositivo/formulario-dispositivo';
import { DialogoValidacion } from '../../dialogos/dilogo-validacion/dialogo-validacion';
import { DialogoConfirmacion } from '../../dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoAlarmas } from '../../dialogos/dialogo-alarmas/dialogo-alarmas';
import { DialogoConexion } from '../../dialogos/dilogo-conexion/dialogo-conexion';

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './pagina-tablero.html',
  styleUrl: './pagina-tablero.scss',
})
export class PaginaTablero {


}