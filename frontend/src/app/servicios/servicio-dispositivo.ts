import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Conexion, Respuesta } from '../recursos/conexion';

@Injectable({ providedIn: 'root' })
export class ServicioDispositivo {

    private ruta: string = 'dispositivos'
    private conexion = inject(Conexion);

    public validarClave(clave: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/validar-clave/${clave}`);
    }

    public solicitarRecuperacion(datos: string): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/crear`, datos);
    }

    public crear(datos: any): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/crear`, datos);
    }

    public actualizar(datos: any): Observable<Respuesta<void>> {
        return this.conexion.put<void>(`${this.ruta}/actualizar`, datos);
    }

    public obtenerLocalizaciones(clave: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/obtener-localizaciones/${clave}`
        );
    }
}
