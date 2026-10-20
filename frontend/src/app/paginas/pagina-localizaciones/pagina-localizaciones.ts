import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pagina-localizaciones',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './pagina-localizaciones.html',
  styleUrl: './pagina-localizaciones.scss'
})
export class PaginaLocalizaciones {
  private readonly sanitizer = inject(DomSanitizer);

  readonly mapaUrl = signal<SafeResourceUrl | null>(null);
  readonly menuAbierto = signal(true);

  constructor() {
    const mapaGeneral = 'https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik';
    this.mapaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(mapaGeneral));
    this.localizarme();
  }

  localizarme(): void {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const margenLatitud = 0.008;
        const margenLongitud = margenLatitud / Math.max(Math.cos(coords.latitude * Math.PI / 180), 0.2);
        const limites = [
          coords.longitude - margenLongitud,
          coords.latitude - margenLatitud,
          coords.longitude + margenLongitud,
          coords.latitude + margenLatitud
        ].join(',');
        const marcador = `${coords.latitude},${coords.longitude}`;
        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${limites}&layer=mapnik&marker=${marcador}`;

        this.mapaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  alternarMenu(): void {
    this.menuAbierto.update(abierto => !abierto);
  }
}
