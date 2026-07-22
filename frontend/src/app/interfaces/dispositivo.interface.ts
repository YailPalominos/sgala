export interface Localizacion {
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface Dispositivo {
  id: number;
  alias: string;
  telefono: string;
  clave: string;
  cualidades: string;
  fechaFinalSuscripcion?: string;
  localizacion: Localizacion | null;
  estadoConexion?: 'conectado' | 'desconectado';
  estadoEncendido: boolean;
  estadoAlarma: boolean;
  estado?:string;
  porcentajeBateria?:number
}
