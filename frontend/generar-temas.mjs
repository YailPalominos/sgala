// Script para generar las imágenes temáticas por cada tema.
// Toma los SVG grises originales de /public y los recolorea según la
// paleta de cada tema, guardándolos en /public/<clave>/.
//
// Uso: node generar-temas.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');

// Archivos temáticos a generar en cada carpeta.
const ARCHIVOS = [
  'gris_fondo.svg',
  'gris_login.svg',
  'logo.svg',
  'logo_sgala.svg',
  'favicon.svg'
];

/*
 * Para cada tema definimos los 3 tonos base (claro, medio, oscuro).
 * Todos los grises originales de los SVG se mapean a estos tonos.
 */
const PALETAS = {
  AN: { claro: '#e6c35c', medio: '#c9a227', oscuro: '#1a1a1a' }, // Año Nuevo
  DA: { claro: '#f06595', medio: '#d6336c', oscuro: '#a61e4d' }, // Día del Amor
  DN: { claro: '#fcc419', medio: '#2f9e44', oscuro: '#1864ab' }, // Día del Niño
  DM: { claro: '#faa2c1', medio: '#e64980', oscuro: '#c2255c' }, // Día de las Madres
  DO: { claro: '#ff8c00', medio: '#e40303', oscuro: '#750787' }, // Día del Orgullo
  VV: { claro: '#fcc419', medio: '#0ca678', oscuro: '#099268' }, // Vacaciones de Verano
  RC: { claro: '#f59f00', medio: '#1971c2', oscuro: '#1864ab' }, // Regreso a Clases
  IM: { claro: '#40c057', medio: '#2b8a3e', oscuro: '#c92a2a' }, // Independencia de México
  HW: { claro: '#f76707', medio: '#e8590c', oscuro: '#1a1a1a' }, // Halloween
  DU: { claro: '#cc5de8', medio: '#9c36b5', oscuro: '#e8590c' }, // Día de Muertos
  NV: { claro: '#e03131', medio: '#c92a2a', oscuro: '#2b8a3e' }, // Navidad
  NB: { claro: '#d4a72c', medio: '#a61e1e', oscuro: '#5c3b00' }  // Nochebuena
};

/*
 * Mapa de reemplazo: cada gris original -> tono de la paleta.
 * claves en minúscula para comparación insensible a mayúsculas.
 */
function construirMapa(paleta) {
  return {
    // Fondos (ondas)
    '#596268': paleta.claro,
    '#3e474d': paleta.medio,
    '#273036': paleta.oscuro,
    // Logo alas (gradiente)
    '#8a979e': paleta.claro,
    '#4a4a4a': paleta.medio,
    '#2a2a2a': paleta.oscuro,
    '#1a1a1a': paleta.oscuro,
    // Logo círculo (gradiente radial)
    '#9aa7ae': paleta.claro,
    '#55646c': paleta.medio
  };
}

function recolorear(contenido, mapa) {
  let resultado = contenido;
  for (const [original, nuevo] of Object.entries(mapa)) {
    // Reemplazo exacto del hex (con #) de forma global, insensible a mayúsculas.
    resultado = resultado.replace(
      new RegExp(original, 'gi'),
      nuevo
    );
  }
  return resultado;
}

/*
 * Colores del arcoíris (bandera del orgullo).
 */
const ARCOIRIS = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];

/*
 * Genera un <linearGradient> arcoíris con el id indicado.
 */
function gradienteArcoiris(id, horizontal = true) {
  const coords = horizontal
    ? 'x1="0" y1="0" x2="1" y2="0"'
    : 'x1="0.5" y1="1" x2="0.5" y2="0"';

  const stops = ARCOIRIS
    .map((color, i) => {
      const offset = Math.round((i / (ARCOIRIS.length - 1)) * 100);
      return `<stop offset="${offset}%" stop-color="${color}"/>`;
    })
    .join('');

  return `<linearGradient id="${id}" ${coords}>${stops}</linearGradient>`;
}

/*
 * Tratamiento especial para el tema arcoíris (Día del Orgullo).
 * - En logos: reemplaza los gradientes de alas y círculo por arcoíris.
 * - En fondos: reemplaza cada onda gris por un color del arcoíris.
 */
function recolorearArcoiris(contenido, archivo) {
  let resultado = contenido;

  const esLogo = /logo|favicon/.test(archivo);

  if (esLogo) {
    // Reemplazar el gradiente de alas (lineal, vertical) por arcoíris vertical.
    resultado = resultado.replace(
      /<linearGradient id="gradAlas"[^>]*>[\s\S]*?<\/linearGradient>/,
      gradienteArcoiris('gradAlas', false)
    );
    // Reemplazar el gradiente del círculo (radial) por arcoíris horizontal.
    resultado = resultado.replace(
      /<radialGradient id="gradCirculo"[^>]*>[\s\S]*?<\/radialGradient>/,
      gradienteArcoiris('gradCirculo', true)
    );
    // El texto SGALA toma el primer color del arcoíris.
    resultado = resultado.replace(/fill="#273036"/gi, `fill="${ARCOIRIS[5]}"`);
  } else {
    // Fondos: cada onda gris toma un color del arcoíris.
    resultado = resultado
      .replace(/#596268/gi, ARCOIRIS[1])  // onda clara -> naranja
      .replace(/#3e474d/gi, ARCOIRIS[3])  // onda media -> verde
      .replace(/#273036/gi, ARCOIRIS[5]); // onda oscura -> morado
  }

  return resultado;
}

for (const [clave, paleta] of Object.entries(PALETAS)) {
  const carpeta = join(PUBLIC, clave);

  if (!existsSync(carpeta)) {
    mkdirSync(carpeta, { recursive: true });
  }

  const mapa = construirMapa(paleta);

  for (const archivo of ARCHIVOS) {
    const origen = join(PUBLIC, archivo);
    const contenido = readFileSync(origen, 'utf8');

    const recoloreado = clave === 'DO'
      ? recolorearArcoiris(contenido, archivo)
      : recolorear(contenido, mapa);

    writeFileSync(join(carpeta, archivo), recoloreado, 'utf8');
  }

  console.log(`Tema ${clave} generado en /public/${clave}/`);
}

console.log('Listo. Imágenes temáticas generadas.');
