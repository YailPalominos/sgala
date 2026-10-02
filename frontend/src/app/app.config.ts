import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { ErrorGlobal } from './recursos/error-global';
import { Solicitudes } from './recursos/solicitudes';
import { provideNgxMask } from 'ngx-mask';

import { PanelSuscripciones } from './paneles/panel-suscripciones/panel-suscripciones.componente';
import { FormularioUsuario } from './formularios/formulario-usuario/formulario-usuario';
import { DialogoValidacion } from './dialogos/dilogo-validacion/dialogo-validacion';
import { PaginaInicio } from './paginas/pagina-inicio/pagina-inicio';

import { InjectionToken, Type, isDevMode } from '@angular/core';
import { FormularioSuscripcion } from './formularios/formulario-suscripcion/formulario-suscripcion';
import { PanelLocalizaciones } from './paneles/panel-localizaciones/panel-localizaciones.componente';
import { FormularioDispositivo } from './formularios/formulario-dipositivo/formulario-dispositivo';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { DialogoConfirmacion } from './dialogos/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoRecuperacion } from './dialogos/dialogo-recuperacion/dialogo-recuperacion';
import { provideServiceWorker } from '@angular/service-worker';
import { DialogoInformacion } from './dialogos/dialogo-informacion/dialogo-informacion';
import { PanelEventos } from './paneles/panel-eventos/panel-eventos.componente';
import { DialogoComparacion } from './dialogos/dilogo-comparacion/dialogo-comparacion';
import { DialogoSeleccion } from './dialogos/dialogo-seleccion/dialogo-seleccion';
import { DialogoAyuda } from './dialogos/dialogo-ayuda/dialogo-ayuda';
import { DialogoAlarmas } from './dialogos/dialogo-alarmas/dialogo-alarmas';
import { DialogoAgente } from './dialogos/dialogo-agente/dialogo-agente';
import { DialogoConexion } from './dialogos/dilogo-conexion/dialogo-conexion';
import { DialogoCaptura } from './dialogos/dialogo-captura/dialogo-captura';
import { DialogoResolucion } from './dialogos/dialogo-resolucion/dialogo-resolucion';

export const clases = new InjectionToken<Type<any>[]>('clases');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([Solicitudes])), provideAnimationsAsync(),
    provideHttpClient(withInterceptors([Solicitudes])),
    provideNgxMask(),
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
        FormularioSuscripcion,
        FormularioDispositivo,
        FormularioUsuario,
        PanelSuscripciones,
        PanelLocalizaciones,
        PanelEventos,
        PaginaInicio,
        PaginaAcceder,
        DialogoValidacion,
        DialogoConfirmacion,
        DialogoRecuperacion,
        DialogoInformacion,
        DialogoComparacion,
        DialogoSeleccion,
        DialogoAyuda,
        DialogoAlarmas,
        DialogoAgente,
        DialogoConexion,
        DialogoCaptura,
        DialogoResolucion
      ]
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately'
    })
  ]
};
