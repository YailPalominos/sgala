import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Credenciales, } from '../interfaces/credenciales';
import { Conexion, Respuesta } from '../recursos/conexion';
import { Sesion } from '../recursos/autenticador';

@Injectable({ providedIn: 'root' })
export class ServicioUsuario {

    private ruta: string = 'usuarios'
    private conexion = inject(Conexion);

    public validarClave(clave: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/validar-clave/${clave}`);
    }

    public acceder(credenciales: Credenciales): Observable<Respuesta<Sesion>> {
        return this.conexion.post<Sesion>(`${this.ruta}/iniciar-sesion`, { identificador: credenciales.identificador, contraseña: credenciales.contrasena });
    }

    public cerrarSesion(): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/cerrar-sesion`, {});
    }

    public verificarIdentidad(identificador: string): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/verificar-identidad/${identificador}`,);
    }

    public solicitarRecuperacion(identificador: string, tipo: string): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/solicitar-recuperacion`, { identificador, tipo });
    }

    public solicitarLlaveRecuperacion(): Observable<Respuesta<any>> {
        return this.conexion.get<any>(`${this.ruta}/solicitar-llave-recuperacion`);
    }

    public cambiarContrasena(datos: any): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/cambiar`, { llave: datos.llave, nuevaContraseña: datos.nuevaContrasena });
    }

    public actualizar(datos: any): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/actualizar`, datos);
    }

    public crear(datos: any): Observable<Respuesta<void>> {
        return this.conexion.post<void>(`${this.ruta}/crear`, datos);
    }
}
