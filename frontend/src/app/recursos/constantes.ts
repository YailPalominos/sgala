/**
 * Constantes globales de la aplicación.
 */

export interface Tema {
  nombre: string;
  clave: string;
}

/**
 * Catálogo de temas disponibles.
 * El tema institucional ('IN') usa la paleta de grises por defecto.
 */
export const temas: Tema[] = [
  { nombre: 'Tema institucional', clave: 'IN' },
  { nombre: 'Año Nuevo', clave: 'AN' },
  { nombre: 'Día del Amor', clave: 'DA' },
  { nombre: 'Día del Niño', clave: 'DN' },
  { nombre: 'Día de las Madres', clave: 'DM' },
  { nombre: 'Día del Orgullo', clave: 'DO' },
  { nombre: 'Vacaciones de Verano', clave: 'VV' },
  { nombre: 'Regreso a Clases', clave: 'RC' },
  { nombre: 'Independencia de México', clave: 'IM' },
  { nombre: 'Halloween', clave: 'HW' },
  { nombre: 'Día de Muertos', clave: 'DU' },
  { nombre: 'Navidad', clave: 'NV' },
  { nombre: 'Nochebuena', clave: 'NB' }
];

/** Clave del tema por defecto (institucional). */
export const TEMA_POR_DEFECTO = 'IN';

/** Clave del almacenamiento local donde se guarda el tema. */
export const CLAVE_TEMA_STORAGE = 'tema';

/**
 * Clave del almacenamiento local donde se guarda el último periodo
 * (año-mes) en el que el usuario respondió a la sugerencia de tema.
 */
export const CLAVE_TEMA_SUGERIDO_STORAGE = 'tema-sugerido-respondido';

/**
 * Tema sugerido por mes (índice 0 = enero ... 11 = diciembre).
 * null significa que ese mes no tiene tema sugerido.
 */
export const TEMA_POR_MES: (string | null)[] = [
  'AN',  // Enero       - Año Nuevo
  'DA',  // Febrero     - Día del Amor
  null,  // Marzo       - (sin tema)
  'DN',  // Abril       - Día del Niño
  'DM',  // Mayo        - Día de las Madres
  'DO',  // Junio       - Día del Orgullo
  'VV',  // Julio       - Vacaciones de Verano
  'RC',  // Agosto      - Regreso a Clases
  'IM',  // Septiembre  - Independencia de México
  'HW',  // Octubre     - Halloween
  'DU',  // Noviembre   - Día de Muertos
  'NV'   // Diciembre   - Navidad
];

/**
 * Opción de navegación mostrada en el toolbar.
 */
export interface RutaNavegacion {
  ruta: string;
  nombre: string;
  clave: string;
  icono: string;
  permiso: string;
}

/**
 * Rutas de administración mostradas en el menú de navegación del toolbar.
 * Todas requieren una sesión de administrador.
 */
export const rutasAdministrador: RutaNavegacion[] = [
  { ruta: '/dispositivos', nombre: 'Dispositivos', clave: 'DIP', permiso: "OBL", icono: 'devices' },
  { ruta: '/usuarios', nombre: 'Usuarios', clave: 'DIP', permiso: "OBL", icono: 'group' },
  { ruta: '/suscripciones-administradores', nombre: 'Eventos admin.', clave: 'EVA', permiso: "OBL", icono: 'hourglass_top' },
  { ruta: '/eventos-administradores', nombre: 'Eventos admin.', clave: 'EVA', permiso: "OBL", icono: 'event' },
  { ruta: '/graficas', nombre: 'Gráficas', clave: 'GRA', permiso: "OBL", icono: 'bar_chart' },
  { ruta: '/administradores', nombre: 'Administradores', clave: 'ADM', permiso: "OBL", icono: 'manage_accounts' },
  { ruta: '/solicitudes', nombre: 'Solicitudes', clave: 'SOL', permiso: "OBL", icono: 'assignment' },
];

export const rutasUsuario: RutaNavegacion[] = [
  { ruta: '/inicio', nombre: 'Inicio', clave: 'CLI', permiso: "INI", icono: 'home' },
  { ruta: '/tablero', nombre: 'Tablero', clave: 'CLI', permiso: "TAB", icono: 'dashboard' },
  { ruta: '/suscripciones', nombre: 'Suscripciones', clave: 'CLI', permiso: "OBL", icono: 'hourglass_top' },
  { ruta: '/eventos', nombre: 'Eventos', clave: 'CLI', permiso: "OBL", icono: 'event' },
];

export function obtenerClavePorRuta(ruta: string): string | null {
  const rutaNormalizada = `/${ruta.replace(/^\/+|\/+$/g, '')}`;

  const opcion = [...rutasAdministrador, ...rutasUsuario]
    .find((opcion: RutaNavegacion) => opcion.ruta === rutaNormalizada);

  return opcion?.clave ?? null;
}