export interface Localizacion {
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface Alarma {
  clave: string;
  descripcion: string;
  fecha: Date
}

export interface Dispositivo {
  id: number;
  alias: string;
  telefono: string;
  clave: string;
  cualidades: string;
  fechaFinalSuscripcion: string | null;
  localizacion: Localizacion | null;
  estatusConexion: boolean | null;
  estadoEncendido: boolean | null;
  estatusAlarma: boolean | null;
  estatusCortaCorriente: boolean | null;
  estado: string | null;
  porcentajeBateria: number | null,
  estatusFijarEstacionado: boolean | null,
  alarmas: Alarma[]| null
}
