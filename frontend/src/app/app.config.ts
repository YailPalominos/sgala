import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { ErrorGlobal } from './recursos/error-global';
import { Solicitudes } from './recursos/solicitudes';

import { PanelSuscripciones } from './paneles/panel-suscripciones/panel-suscripciones.componente';
import { FormularioUsuario } from './formularios/formulario-usuario/formulario-usuario';
import { DialogoValidacion } from './dialogos/dilogo-validacion/dialogo-validacion';
import { PaginaPrincipal } from './paginas/pagina-inicio/pagina-principal';

import { InjectionToken, Type } from '@angular/core';
import { FormularioSuscripcion } from './formularios/formulario-suscripcion/formulario-suscripcion';
import { PanelLocalizaciones } from './paneles/panel-localizaciones/panel-localizaciones.componente';
import { FormularioDispositivo } from './formularios/formulario-dipositivo/formulario-dispositivo';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { DialogoConfirmacion } from './dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoRecuperacion } from './dialogos/dialogo-recuperacion/dialogo-recuperacion';

export const clases = new InjectionToken<Type<any>[]>('clases');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([Solicitudes])), provideAnimationsAsync(),
    provideHttpClient(withInterceptors([Solicitudes])),
    {
      provide: ErrorHandler,
      useClass: ErrorGlobal
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop: false
      }
    },
    {
      provide: clases,
      useValue: [
        FormularioUsuario,
        FormularioSuscripcion,
        FormularioDispositivo,
        FormularioUsuario,
        PanelSuscripciones,
        PanelLocalizaciones,
        PaginaPrincipal,
        PaginaAcceder,
        DialogoValidacion,
        DialogoConfirmacion,
        DialogoRecuperacion
      ]
    }
  ]
};
