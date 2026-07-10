export interface RegistroRequest {
  uuidPreDispositivo: string;
  alias: string;
  correo: string;
  contrasena: string;
  telefono: string;
}

export interface LoginRequest {
  alias: string;
  contrasena: string;
}

export interface CambioContrasenaRequest {
  llave: string;
  nuevaContrasena: string;
}
