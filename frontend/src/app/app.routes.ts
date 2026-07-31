import { Routes } from '@angular/router';
import { PaginaRestablecer } from './paginas/pagina-restablecer/pagina-restablecer';
import { PaginaInformacion } from './paginas/pagina-informacion/pagina-informacion';
import { PaginaPrincipal } from './paginas/pagina-inicio/pagina-principal';
import { PaginaAcceder } from './paginas/pagina-acceder/pagina-acceder';
import { Autorizador } from './recursos/autorizador';
export const routes: Routes = [
  { path: '', redirectTo: 'acceder', pathMatch: 'full' },
  { path: 'acceder', component: PaginaAcceder },
  { path: 'restablecer', component: PaginaRestablecer },
  { path: 'inicio', component: PaginaPrincipal, canActivate: [Autorizador] },
  { path: 'informacion', component: PaginaInformacion },
  { path: '**', redirectTo: 'acceder' },
];
