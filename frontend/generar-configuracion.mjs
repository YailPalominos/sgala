import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directorio = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await readFile(path.join(directorio, 'package.json'), 'utf8'));

async function leerEnvBackend() {
  try {
    return await readFile(path.resolve(directorio, '../backend/.env'), 'utf8');
  } catch {
    return '';
  }
}

const envTexto = await leerEnvBackend();
function obtener(nombre, predeterminado) {
  if (process.env[nombre]?.trim()) return process.env[nombre].trim();
  const coincidencia = envTexto.match(new RegExp(`^\\s*${nombre}\\s*=\\s*(.*)\\s*$`, 'm'));
  return coincidencia ? coincidencia[1].trim().replace(/^(?:"([^"]*)"|'([^']*)')$/, (_, doble, simple) => doble ?? simple) : predeterminado;
}

const modo = process.argv[2] === 'production' ? 'production' : 'development';
const host = obtener('ENLACE_SERVIDOR', 'localhost').replace(/^[a-z]+:\/\//i, '').replace(/\/$/, '');
const api = Number(obtener('PUERTO_API', '4059'));
const broker = Number(obtener('PUERTO_BROKER', '4060'));
const socket = Number(obtener('PUERTO_SOCKET', '4061'));
if (![api, broker, socket].every((puerto) => Number.isInteger(puerto) && puerto > 0 && puerto <= 65535)) {
  throw new Error('PUERTO_API, PUERTO_BROKER y PUERTO_SOCKET deben ser puertos válidos.');
}

const base = `https://${host}`;
const configuracion = {
  apiUrl: modo === 'production' ? `${base}/api/` : `${base}:${api}/api/`,
  socketUrl: modo === 'production' ? `${base}/socket` : `${base}:${socket}/socket`,
  socketPath: '/sgala/socket.io',
  agentSocketUrl: modo === 'production' ? base : `${base}:4700`,
  agentSocketPath: '/socket.io',
  version: packageJson.version,
  puertos: { api, broker, socket },
};

await writeFile(path.join(directorio, 'public/runtime-config.js'), `window.SGALA_CONFIG = Object.freeze(${JSON.stringify(configuracion)});\n`);
console.log(`Configuración frontend ${modo} generada para ${host}.`);
