import { Routes } from '@angular/router';
import { PaginaRestablecer } from './paginas/pagina-restablecer/pagina-restablecer';
import { PaginaInformacion } from './paginas/pagina-informacion/pagina-informacion';
import { PaginaInicio } from './paginas/pagina-inicio/pagina-inicio';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { PaginaNoEncontrada } from './paginas/pagina-no-encontrada/pagina-no-encontrada';
import { PaginaDispositivos } from './paginas/pagina-dispositivos/pagina-dispositivos';
import { PaginaUsuarios } from './paginas/pagina-usuarios/pagina-usuarios';

import { PaginaAdministradores } from './paginas/pagina-administradores/pagina-administradores';
import { PaginaGraficas } from './paginas/pagina-graficas/pagina-graficas';
import { PaginaEventosAdministradores } from './paginas/pagina-eventos-administradores/pagina-eventos-administradores';
import { PaginaEventos } from './paginas/pagina-eventos/pagina-eventos';
import { PaginaConfirmar } from './paginas/pagina-confirmar/pagina-confirmar';
import { PaginaTablero } from './paginas/pagina-tablero/pagina-tablero';
import { PaginaSolicitudes } from './paginas/pagina-solicitudes/pagina-solicitudes';
import { Autorizador } from './recursos/autorizador';

export const routes: Routes = [
  { path: '', redirectTo: 'acceder', pathMatch: 'full' },

  // Rutas públicas
  { path: 'confirmar', component: PaginaConfirmar },
  { path: 'acceder', component: PaginaAcceder },
  { path: 'restablecer', component: PaginaRestablecer },
  { path: 'informacion', component: PaginaInformacion },

  // Rutas protegidas
  { path: 'inicio', component: PaginaInicio, canActivate: [Autorizador] },
  { path: 'tablero', component: PaginaTablero, canActivate: [Autorizador] },
  { path: 'suscripciones', component: PaginaSolicitudes, canActivate: [Autorizador] },
  { path: 'eventos', component: PaginaEventos, canActivate: [Autorizador] },
  { path: 'dispositivos', component: PaginaDispositivos, canActivate: [Autorizador] },
  { path: 'usuarios', component: PaginaUsuarios, canActivate: [Autorizador] },
  { path: 'eventos-administradores', component: PaginaEventosAdministradores, canActivate: [Autorizador] },
  { path: 'graficas', component: PaginaGraficas, canActivate: [Autorizador] },
  { path: 'administradores', component: PaginaAdministradores, canActivate: [Autorizador] },

  // Ruta comodín: siempre al final
  { path: '**', component: PaginaNoEncontrada }
];
