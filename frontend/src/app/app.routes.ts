import { Routes } from '@angular/router';
import { PaginaRestablecer } from './paginas/pagina-restablecer/pagina-restablecer';
import { PaginaInformacion } from './paginas/pagina-informacion/pagina-informacion';
import { PaginaInicio } from './paginas/pagina-inicio/pagina-inicio';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { PaginaNoEncontrada } from './paginas/pagina-no-encontrada/pagina-no-encontrada';
import { Autorizador } from './recursos/autorizador';
import { AutorizadorAdministrador } from './recursos/autorizador';
import { PaginaDispositivos } from './paginas/pagina-dispositivos/pagina-dispositivos';
import { PaginaUsuarios } from './paginas/pagina-usuarios/pagina-usuarios';
import { PaginaEventosAdministracion } from './paginas/pagina-eventos-administracion/pagina-eventos-administracion';
import { PaginaAdministradores } from './paginas/pagina-administradores/pagina-administradores';
import { PaginaGraficas } from './paginas/pagina-graficas/pagina-graficas';
import { PaginaEventosAdministradores } from './paginas/pagina-eventos-administradores/pagina-eventos-administradores';
export const routes: Routes = [
  { path: '', redirectTo: 'acceder', pathMatch: 'full' },
  { path: 'acceder', component: PaginaAcceder },
  { path: 'restablecer', component: PaginaRestablecer },
  { path: 'inicio', component: PaginaInicio, canActivate: [Autorizador] },
  { path: 'dispositivos', component: PaginaDispositivos, canActivate: [AutorizadorAdministrador] },
  { path: 'usuarios', component: PaginaUsuarios, canActivate: [AutorizadorAdministrador] },
  { path: 'eventos', component: PaginaEventosAdministracion, canActivate: [AutorizadorAdministrador] },
  { path: 'eventos-administradores', component: PaginaEventosAdministradores, canActivate: [AutorizadorAdministrador] },
  { path: 'graficas', component: PaginaGraficas, canActivate: [AutorizadorAdministrador] },
  { path: 'administradores', component: PaginaAdministradores, canActivate: [AutorizadorAdministrador] },
  { path: 'informacion', component: PaginaInformacion },
  { path: '**', component: PaginaNoEncontrada },
];
