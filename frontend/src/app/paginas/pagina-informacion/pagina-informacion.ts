import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { DialogoServicio } from '../../recursos/dialogo.servicio';
import { DialogoAsistente } from '../../dialogos/dialogo-asistente/dialogo-asistente';
import { MatTooltip } from '@angular/material/tooltip';
@Component({
  selector: 'app-informacion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltip
  ],
  templateUrl: './pagina-informacion.html',
  styleUrl: './pagina-informacion.scss',
})
export class PaginaInformacion {

  private router = inject(Router);
  private dialogoServicio = inject(DialogoServicio)

  irAmazon(): void {
    window.open('https://www.amazon.com.mx/', '_blank');
  }

  volver(): void {
    this.router.navigate(['/iniciar-sesion']);
  }

  abrirAsistente(): void {
    this.dialogoServicio.abrir({
      referencia: DialogoAsistente,
      titulo: 'Asistente',
      icono: 'support_agent',
      largo: '500px',
      desactivarAutocerrado: true,
    });
  }

}
