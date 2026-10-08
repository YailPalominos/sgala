import { Component, inject } from '@angular/core';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { Cargador, NOMBRE_SPINNER } from '../../recursos/cargador';

@Component({
  selector: 'app-cargador',
  standalone: true,
  imports: [NgxSpinnerComponent],
  template: `
    <ngx-spinner
      [name]="nombreSpinner"
      type="ball-spin-clockwise-fade-rotating"
      size="large"
      color="#616161"
      bdColor="rgba(223, 223, 223, 0.7)"
      [fullScreen]="true">

      <div class="cargador-contenido">
        <div class="texto">
          Cargando <span class="puntos"></span>
        </div>

        @if (cargador.mensaje()) {
          <div class="mensaje-error">
            {{ cargador.mensaje() }}
          </div>
        }
      </div>
    </ngx-spinner>
  `,
  styles: [`
    .cargador-contenido {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-top: 120px;
    }

    .texto {
      font-size: 18px;
      font-weight: 500;
      color: #333;
    }

    .mensaje-error {
      font-size: 16px;
      font-weight: 600;
      color: #d32f2f;
      text-align: center;
      max-width: 280px;
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
  nombreSpinner = NOMBRE_SPINNER;
}
