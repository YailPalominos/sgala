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
  telefono?: string;
  tipo: string;
  tipoTexto?: string;
  clave: string;
  cualidades: string;
  fechaFinalSuscripcion: string | null;
  localizacion: Localizacion | null;
  estatus: boolean | null;
  estatusConexion: boolean | null;
  estatusEncendida: boolean | null;
  estatusMovimiento: boolean | null;
  estatusAlarma: boolean | null;
  estatusCortaCorriente: boolean | null;
  porcentajeBateria: number | null,
  estatusFijarEstacionado: boolean | null,
  alarmas: Alarma[] | null
}
