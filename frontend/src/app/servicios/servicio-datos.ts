import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conexion, Respuesta } from '../recursos/conexion';

@Injectable({ providedIn: 'root' })
export class ServicioDatos {

    private ruta: string = 'datos'
    private conexion = inject(Conexion);

    public obtenerPrecios(): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-precios`);
    }

    public obtenerSuscripcionesDispositivo(claveDispositivo: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-suscripciones-dispositivo/${claveDispositivo}`);
    }

    public obtenerResumenSuscripcion(claveDispositivo: string, tipoSuscripcion: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-resumen-suscripcion-dispositivo/${claveDispositivo}/${tipoSuscripcion}`);
    }

    public crearSuscripcion(datos: any): Observable<Respuesta<any>> {
        return this.conexion.post<any>(`${this.ruta}/crear-suscripcion`, datos);
    }
    public obtenerSuscripciones(): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-suscripciones`);
    }
}
