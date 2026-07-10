import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  RegistroRequest,
  LoginRequest,
  CambioContrasenaRequest,
} from '../interfaces/autenticacion.interface';

@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  registro(datos: RegistroRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/registro`, datos);
  }

  login(datos: LoginRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/login`, datos);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/logout`, {});
  }

  solicitarRecuperacion(correo: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/auth/recuperacion/solicitar`,
      { correo }
    );
  }

  cambiarContrasena(datos: CambioContrasenaRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/auth/recuperacion/cambiar`,
      datos
    );
  }
}
