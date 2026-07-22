import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CargadorServicio } from '../../servicios/cargador.servicio';

@Component({
  selector: 'app-cargador',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (cargador.visible()) {
      <div class="cargador-overlay">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }
  `,
  styles: [`
    .cargador-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
  `],
})
export class CargadorComponent {
  cargador = inject(CargadorServicio);
}
