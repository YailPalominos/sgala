import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-informacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './pagina-informacion.html',
  styleUrl: './pagina-informacion.scss',
})
export class PaginaInformacion {

  private router = inject(Router);


  irAmazon(): void {
    window.open('https://www.amazon.com.mx/', '_blank');
  }

  volver(): void {
    this.router.navigate(['/iniciar-sesion']);
  }


}
