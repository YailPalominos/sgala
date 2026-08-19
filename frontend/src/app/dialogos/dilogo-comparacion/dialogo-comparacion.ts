import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Dialogo } from '../../recursos/dialogo.base';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'dialogo-comparacion',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './dialogo-comparacion.html',
  styleUrl: './dialogo-comparacion.scss',
})
export class DialogoComparacion extends Dialogo {

  public get datosComparacion(): any {
    return this.datos;
  }

  public get consultado(): any {
    return this.datosComparacion?.consultado;
  }

  public get anterior(): any {
    return this.datosComparacion?.anterior;
  }

  public get propiedadesConsultado(): string[] {
    return this.consultado?.datos
      ? Object.keys(this.consultado.datos)
      : [];
  }

  public get propiedadesAnterior(): string[] {
    return this.anterior?.datos
      ? Object.keys(this.anterior.datos)
      : [];
  }

  public tipoTexto(tipo: 'C' | 'A'): string {
    return tipo === 'C'
      ? 'Creación'
      : 'Actualización';
  }

  public formatearPropiedad(propiedad: string): string {
    return propiedad
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, letra => letra.toUpperCase());
  }

  public formatearValor(valor: unknown): string {

    if (valor === null || valor === undefined) {
      return 'Sin valor';
    }

    if (typeof valor === 'boolean') {
      return valor ? 'Verdadero' : 'Falso';
    }

    if (typeof valor === 'object') {
      return JSON.stringify(valor);
    }

    return String(valor);
  }

  public fueModificado(propiedad: string): boolean {
    if (!this.anterior?.datos || !this.consultado?.datos) {
      return false;
    }

    return JSON.stringify(
      this.consultado.datos[propiedad]
    ) !== JSON.stringify(
      this.anterior.datos[propiedad]
    );
  }
}