import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Credenciales } from '../interfaces/credenciales';
import { Conexion, Respuesta } from '../recursos/conexion';
import { Sesion } from '../recursos/autenticador';

@Injectable({ providedIn: 'root' })
export class ServicioAdministrador {
  private readonly ruta = 'administradores';
  private readonly conexion = inject(Conexion);

  public autenticar(credenciales: Credenciales): Observable<Respuesta<Sesion>> {
    return this.conexion.post<Sesion>(`${this.ruta}/autenticar`, {
      identificador: credenciales.identificador,
      contraseña: credenciales.contrasena
    });
  }

  public obtenerLista(): Observable<Respuesta<any[]>> {
    return this.conexion.get<any[]>(`${this.ruta}/obtener-lista`);
  }

  public obtenerListaDispositivos(): Observable<Respuesta<any[]>> {
    return this.conexion.get<any[]>(`${this.ruta}/dispositivos/obtener-lista`);
  }

  public obtenerListaUsuarios(): Observable<Respuesta<any[]>> {
    return this.conexion.get<any[]>(`${this.ruta}/usuarios/obtener-lista`);
  }

  public obtenerListaEventos(): Observable<Respuesta<any[]>> {
    return this.conexion.get<any[]>(`${this.ruta}/eventos/obtener-lista`);
  }

  public obtenerListaEventosAdministradores(): Observable<Respuesta<any[]>> {
    return this.conexion.get<any[]>(`${this.ruta}/eventos-administradores/obtener-lista`);
  }

  public obtenerPerfil(): Observable<Respuesta<{
    id: number;
    nombres: string;
    apellidos: string;
    direccionCorreoElectronico: string;
    alias: string;
  }>> {
    return this.conexion.get(`${this.ruta}/perfil`);
  }

  public actualizarPerfil(datos: {
    nombres: string;
    apellidos: string;
    direccionCorreoElectronico: string;
    alias: string;
    contrasena?: string;
  }): Observable<Respuesta<{ alias: string; direccionCorreoElectronico: string }>> {
    return this.conexion.put(`${this.ruta}/perfil`, datos);
  }

  public crearPreDispositivo(datos: {
    tipo: 'I' | 'T' | 'C' | 'D';
    cualidades: string | null;
  }): Observable<Respuesta<{ id: number; clave: string }>> {
    return this.conexion.post<{ id: number; clave: string }>(
      `${this.ruta}/pre-dispositivos/crear`,
      datos
    );
  }

  public obtener(id: number): Observable<Respuesta<any>> {
    return this.conexion.get<any>(`${this.ruta}/obtener/${id}`);
  }

  public crear(datos: any): Observable<Respuesta<{ id: number }>> {
    return this.conexion.post<{ id: number }>(`${this.ruta}/crear`, datos);
  }

  public actualizar(datos: any): Observable<Respuesta<void>> {
    return this.conexion.put<void>(`${this.ruta}/actualizar`, datos);
  }
}
