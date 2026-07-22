import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AutenticacionServicio } from './autenticacion.servicio';
import { environment } from '../../environments/environment';

export interface Respuesta<T> {
    datos: T;
    mensaje: string;
    estatus: number;
}

@Injectable({
    providedIn: 'root'
})
export class ConexionService {

    private rutaServidor: string = ""

    constructor(private http: HttpClient, private autenticacionService: AutenticacionServicio) {
        this.rutaServidor = environment.apiUrl;
    }

    private obtenerEncabezado(): HttpHeaders {
        return new HttpHeaders({
            'clave-sesion': this.autenticacionService.obtenerSesion()?.clave ?? ''
        });
    }

    public get<T>(rutaControlador: string, filtros?: any): Observable<Respuesta<T>> {
        const parametros = filtros ? this.objetoAHttpParams(filtros) : undefined;

        return this.http.get<Respuesta<T>>(
            this.rutaServidor + rutaControlador,
            {
                params: parametros,
                headers: this.obtenerEncabezado()
            }
        );
    }

    public post<T>(rutaControlador: string, body: any): Observable<Respuesta<T>> {
        return this.http.post<Respuesta<T>>(this.rutaServidor + rutaControlador, body, { headers: this.obtenerEncabezado() });
    }

    public put<T>(rutaControlador: string, body: any = null): Observable<Respuesta<T>> {
        return this.http.put<Respuesta<T>>(this.rutaServidor + rutaControlador, body, {
            headers: this.obtenerEncabezado()
        });
    }

    //Funcion auxiliar
    private objetoAHttpParams(obj: Record<string, any>): HttpParams {
        let params = new HttpParams();
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== null && value !== "" && value !== false) {
                params = params.set(key, String(value));
            }
        }
        return params;
    }

}