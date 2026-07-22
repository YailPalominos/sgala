import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { autenticacionInterceptor } from './interceptors/autenticacion.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Interceptor } from './servicios/interceptor';
import { ErrorGlobalService } from './servicios/error-global.service';

import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([autenticacionInterceptor])), provideAnimationsAsync(),
    provideHttpClient(withInterceptors([Interceptor])),
    {
      provide: ErrorHandler,
      useClass: ErrorGlobalService
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop: false
      }
    }
  ]
};
