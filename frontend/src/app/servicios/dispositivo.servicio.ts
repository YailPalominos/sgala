import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dispositivo } from '../interfaces/dispositivo.interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DispositivoServicio {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  obtenerDispositivos(): Observable<Dispositivo[]> {
    return this.http.get<Dispositivo[]>(`${this.baseUrl}/api/dispositivos`);
  }
}
