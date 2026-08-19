import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conexion, Respuesta } from '../recursos/conexion';

@Injectable({ providedIn: 'root' })
export class ServicioEvento {

    private ruta: string = 'eventos'
    private conexion = inject(Conexion);

    public obtenerLista(filtros: any): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-lista`, filtros);
    }

    public obtenerDatosElemento(idElemento: number): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-datos-elemento/${idElemento}`);
    }
}
