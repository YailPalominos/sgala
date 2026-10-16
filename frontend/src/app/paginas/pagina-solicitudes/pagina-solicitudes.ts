import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TemaServicio } from '../../recursos/tema.servicio';

@Component({
  selector: 'app-pagina-solicitudes',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './pagina-solicitudes.html'
})
export class PaginaSolicitudes {


}
