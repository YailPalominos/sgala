import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conexion, Respuesta } from '../recursos/conexion';

@Injectable({ providedIn: 'root' })
export class ServicioSuscripciones {

    private ruta: string = 'suscripciones'
    private conexion = inject(Conexion);

    public crear(datos: any): Observable<Respuesta<any>> {
        return this.conexion.post<any>(`${this.ruta}/crear`, datos);
    }
    public obtenerLista(filtros: any): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-lista`, filtros);
    }

    public obtenerSuscripcionesDispositivo(claveDispositivo: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-suscripciones-dispositivo/${claveDispositivo}`);
    }

    public obtenerResumenSuscripcion(claveDispositivo: string, tipoSuscripcion: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-resumen-suscripcion-dispositivo/${claveDispositivo}/${tipoSuscripcion}`);
    }

}
