import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
    Credenciales,
} from '../interfaces/credenciales.interfaz';
import { ConexionService, Respuesta } from './conexion.service';
import { Sesion } from './autenticacion.servicio';


@Injectable({ providedIn: 'root' })
export class UsuarioServicio {

    private conexionService = inject(ConexionService);

    public validarClave(clave: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `usuario/validar-clave/${clave}`,
        );
    }

    public acceder(credenciales: Credenciales): Observable<Respuesta<Sesion>> {
        return this.conexionService.post<Sesion>(`usuario/iniciar-sesion`,
            { identificador: credenciales.identificador, contraseña: credenciales.contrasena }
        );
    }

    public cerrarSesion(): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(`usuario/cerrar-sesion`, {});
    }

    public verificarIdentidad(identificador: string): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `usuario/verificar-identidad/${identificador}`,
        );
    }

    public solicitarRecuperacion(identificador: string, tipo: string): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(
            `usuario/solicitar-recuperacion`,
            { identificador, tipo }
        );
    }

    public solicitarLlaveRecuperacion(): Observable<Respuesta<any>> {
        return this.conexionService.get<any>(
            `usuario/solicitar-llave-recuperacion`
        );
    }

    public cambiarContrasena(datos: any): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(
            `usuario/recuperacion/cambiar`,
            { llave: datos.llave, nuevaContraseña: datos.nuevaContrasena }
        );
    }

    public actualizar(datos: any): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(
            `usuario/actualizar`,
            datos
        );
    }

    public crear(datos: any): Observable<Respuesta<void>> {
        return this.conexionService.post<void>(
            `usuario/crear`,
            datos
        );
    }
}
