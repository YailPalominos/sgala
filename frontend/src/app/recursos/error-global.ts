import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Notificador } from './notificador';

@Injectable({
  providedIn: 'root'
})
export class ErrorGlobal implements ErrorHandler {

  constructor(
    private notificador: Notificador
  ) {}

  handleError(error: any): void {

    if (error instanceof HttpErrorResponse) {

      const mensaje =
        error.error?.mensaje ?? 'Error inesperado';

      this.notificador.error(
        mensaje,
        mensaje === 'Formulario inválido' ? 3 : undefined
      );

      return;
    }

    this.notificador.error(
      error.message ?? 'Error desconocido'
    );
  }
}