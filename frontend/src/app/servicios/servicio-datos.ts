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
}
