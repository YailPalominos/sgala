import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TemaServicio } from '../../recursos/tema.servicio';

@Component({
  selector: 'app-pagina-no-encontrada',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pagina-no-encontrada.html',
  styleUrl: './pagina-no-encontrada.scss',
})
export class PaginaNoEncontrada {

  private router = inject(Router);
  public temaServicio = inject(TemaServicio);

  volver(): void {
    this.router.navigate(['/acceder']);
  }
}
