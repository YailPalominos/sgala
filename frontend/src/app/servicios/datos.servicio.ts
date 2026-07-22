import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConexionService, Respuesta } from './conexion.service';

@Injectable({ providedIn: 'root' })
export class DatosServicio {

    private conexionService = inject(ConexionService);

    public obtenerPrecios(): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `datos/obtener-precios`,
        );
    }

    public obtenerSuscripcionesDispositivo(claveDispositivo: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `datos/obtener-suscripciones-dispositivo/${claveDispositivo}`
        );
    }

    public obtenerResumenSuscripcion(claveDispositivo: string, tipoSuscripcion: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `datos/obtener-resumen-suscripcion-dispositivo/${claveDispositivo}/${tipoSuscripcion}`,
        );
    }

    public crearSuscripcion(datos: any): Observable<Respuesta<any>> {
        return this.conexionService.post<any>(
            `datos/crear-suscripcion`,
            datos
        );
    }
    public obtenerSuscripciones(): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `datos/obtener-suscripciones`
        );
    }
}
