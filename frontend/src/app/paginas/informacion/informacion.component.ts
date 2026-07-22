import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  templateUrl: './informacion.component.html',
  styleUrl: './informacion.component.scss',
})
export class Informacion {

  private router = inject(Router);


  irAmazon(): void {
    window.open('https://www.amazon.com.mx/', '_blank');
  }

  volver(): void {
    this.router.navigate(['/iniciar-sesion']);
  }


}
