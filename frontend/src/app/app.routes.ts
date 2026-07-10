import { Routes } from '@angular/router';
import { LoginComponent } from './paginas/login/login.component';
import { RegistroComponent } from './paginas/registro/registro.component';
import { RecuperacionSolicitudComponent } from './paginas/recuperacion-solicitud/recuperacion-solicitud.component';
import { RecuperacionCambioComponent } from './paginas/recuperacion-cambio/recuperacion-cambio.component';
import { PanelComponent } from './paginas/panel/panel.component';
import { autenticacionGuard } from './guards/autenticacion.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'recuperacion/solicitar', component: RecuperacionSolicitudComponent },
  { path: 'recuperacion/cambiar', component: RecuperacionCambioComponent },
  { path: 'panel', component: PanelComponent, canActivate: [autenticacionGuard] },
  { path: '**', redirectTo: 'login' },
];
