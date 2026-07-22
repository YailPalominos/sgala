import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConexionService, Respuesta } from './conexion.service';

@Injectable({ providedIn: 'root' })
export class DispositivoServicio {

    private conexionService = inject(ConexionService);

    public validarClave(clave: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `dispositivos/validar-clave/${clave}`,
        );
    }

    public solicitarRecuperacion(datos: string): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(`dispositivos/crear`, datos);
    }

    public crear(datos: any): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(`dispositivos/crear`, datos);
    }

    public actualizar(datos: any): Observable<Respuesta<void>> {
        return this.conexionService.put<void>(`dispositivos/actualizar`, datos);
    }

    public obtenerLocalizaciones(clave: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `dispositivos/obtener-localizaciones/${clave}`,
        );
    }
}
