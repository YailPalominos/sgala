import { Routes } from '@angular/router';
import { LoginComponent } from './paginas/login/login.component';
import { RestablecerComponent } from './paginas/restablecer/restablecer.component';
import { autenticacionGuard } from './guards/autenticacion.guard';
import { Informacion } from './paginas/informacion/informacion.component';
import { PanelPrincipalComponent } from './paneles/panel-principal/panel-principal.componente';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'inicio-sesion', component: LoginComponent },
  { path: 'restablecer', component: RestablecerComponent },
  { path: 'inicio', component: PanelPrincipalComponent, canActivate: [autenticacionGuard] },
  { path: 'informacion', component: Informacion },
  { path: '**', redirectTo: 'inicio-sesion' },
];
