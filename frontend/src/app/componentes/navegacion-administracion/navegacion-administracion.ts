import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navegacion-administracion',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <header class="encabezado">
      <h1>{{ titulo }}</h1>
      <div class="navegacion-opciones">
        <span></span>
        <nav class="chips" aria-label="Secciones de administración">
          <a mat-button routerLink="/dispositivos" routerLinkActive="activo">Dispositivos</a>
          <a mat-button routerLink="/usuarios" routerLinkActive="activo">Usuarios</a>
          <a mat-button routerLink="/eventos" routerLinkActive="activo">Eventos</a>
          <a mat-button routerLink="/eventos-administradores" routerLinkActive="activo">Eventos admin.</a>
          <a mat-button routerLink="/graficas" routerLinkActive="activo">Gráficas</a>
          <a mat-button routerLink="/administradores" routerLinkActive="activo">Administradores</a>
        </nav>
        @if (mostrarCrear) {
          <button mat-flat-button type="button" (click)="crear.emit()">
            <mat-icon>add</mat-icon>
            Crear
          </button>
        } @else {
          <span></span>
        }
      </div>
    </header>
  `,
  styles: [`
    .encabezado {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 20px;
      width: 100%;
    }

    h1 {
      margin: 0;
      text-align: center;
      font-size: 1.55rem;
      font-weight: 600;
      color: var(--tema-primary, #424242);
    }

    .navegacion-opciones {
      display: grid;
      grid-template-columns: minmax(50px, 1fr) auto minmax(50px, 1fr);
      align-items: center;
      gap: 12px;
    }

    .chips {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 4px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
      color: var(--tema-primary, #424242);
    }

    .chips a {
      min-width: 0;
      border-radius: 999px;
      text-decoration: none;
      color: var(--tema-primary, #424242);
    }

    .chips a.activo {
      background: var(--mat-sys-primary);
      color: #fff;
    }

    :host ::ng-deep .chips a.activo .mdc-button__label {
      color: #fff;
    }

    .encabezado > button {
      justify-self: end;
      border-radius: 999px;
    }
    
    .navegacion-opciones > button {
      justify-self: end;
    }

    @media (max-width: 650px) {
      .navegacion-opciones {
        grid-template-columns: 1fr auto;
        gap: 8px;
      }

      .chips {
        grid-column: 1;
        grid-row: 1;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 0;
      }

      .navegacion-opciones > span {
        display: none;
      }
    }
  `]
})
export class NavegacionAdministracion {
  @Input({ required: true }) titulo = '';
  @Input() mostrarCrear = false;
  @Output() crear = new EventEmitter<void>();
}
