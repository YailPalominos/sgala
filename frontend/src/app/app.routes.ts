import { Routes } from '@angular/router';
import { PaginaRestablecer } from './paginas/pagina-restablecer/pagina-restablecer';
import { PaginaInformacion } from './paginas/pagina-informacion/pagina-informacion';
import { PaginaInicio } from './paginas/pagina-inicio/pagina-inicio';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { PaginaNoEncontrada } from './paginas/pagina-no-encontrada/pagina-no-encontrada';
import { Autorizador } from './recursos/autorizador';
export const routes: Routes = [
  { path: '', redirectTo: 'acceder', pathMatch: 'full' },
  { path: 'acceder', component: PaginaAcceder },
  { path: 'restablecer', component: PaginaRestablecer },
  { path: 'inicio', component: PaginaInicio, canActivate: [Autorizador] },
  { path: 'informacion', component: PaginaInformacion },
  { path: '**', component: PaginaNoEncontrada },
];
