import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Cargador } from '../../recursos/cargador';

@Component({
  selector: 'app-cargador',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    @if (cargador.visible()) {
      <div class="cargador-overlay">
        <div class="cargador-contenido">
          <mat-spinner diameter="140"></mat-spinner>

          <div class="texto">
            Cargando <span class="puntos"></span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cargador-overlay {
      position: fixed;
      inset: 0;
      background: rgba(223, 223, 223, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .cargador-contenido {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .texto {
      font-size: 18px;
      font-weight: 500;
      color: #333;
    }

    .puntos::after {
      content: '';
      display: inline-block;
      width: 1.5em;
      text-align: left;
      animation: puntos 2s steps(4, end) infinite;
    }

    @keyframes puntos {
      0%   { content: ''; }
      10%  { content: '.'; }
      20%  { content: '..'; }
      30%  { content: '...'; }
      40%  { content: '....'; }
      50%  { content: '.....'; }
      60%  { content: '......'; }
      70%  { content: '.......'; }
      80%  { content: '........'; }
      90%  { content: '.........'; }
      100% { content: '..........'; }
    }
  `]
})
export class CargadorComponent {
  cargador = inject(Cargador);
}