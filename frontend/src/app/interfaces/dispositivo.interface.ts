export interface Localizacion {
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface Dispositivo {
  id: number;
  telefono: string;
  localizacion: Localizacion | null;
  estadoConexion?: 'conectado' | 'desconectado';
}
