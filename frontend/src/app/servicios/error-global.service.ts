import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificadorServicio } from './notificador.servicio';

@Injectable({
  providedIn: 'root'
})
export class ErrorGlobalService implements ErrorHandler {

  constructor(
    private notificadorServicio: NotificadorServicio
  ) {}

  handleError(error: any): void {

    if (error instanceof HttpErrorResponse) {

      const mensaje =
        error.error?.mensaje ?? 'Error inesperado';

      this.notificadorServicio.error(
        mensaje,
        mensaje === 'Formulario inválido' ? 3 : undefined
      );

      return;
    }

    this.notificadorServicio.error(
      error.message ?? 'Error desconocido'
    );
  }
}