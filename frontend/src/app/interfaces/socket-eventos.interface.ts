export interface EventoLocalizacion {
  dispositivoId: number;
  latitud: number;
  longitud: number;
  altitud: number;
  timestamp: number;
}

export interface EventoEstadoConexion {
  dispositivoId: number;
  estadoConexion: 'conectado' | 'desconectado';
}
