import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { entorno } from "./entorno";

const directorioEventos = path.join(
    entorno.DIRECTORIO,
    "eventos"
);

/** Nivel del registro, útil para distinguir logs normales de errores. */
export type NivelEvento = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * Escribe una línea de registro en el archivo del día.
 * Los archivos se organizan por eventos/AAAA/MM/DD.txt.
 */
function escribirRegistro(
    nivel: NivelEvento,
    descripcion: string,
    datos?: unknown
): void {

    const fecha = dayjs();

    const carpeta = path.join(
        directorioEventos,
        fecha.format("YYYY"),
        fecha.format("MM")
    );

    fs.mkdirSync(carpeta, {
        recursive: true
    });

    const archivo = path.join(
        carpeta,
        `${fecha.format("DD")}.txt`
    );

    let contenido = `${fecha.format("HH:mm:ss")} [${nivel}] - ${descripcion}`;

    if (datos !== undefined) {
        contenido += `\n${formatearDatos(datos)}`;
    }

    contenido += "\n";

    fs.appendFileSync(
        archivo,
        contenido,
        {
            encoding: "utf8"
        }
    );
}

/**
 * Serializa los datos adicionales de forma segura.
 * Los Error se expanden a mensaje + stack; el resto a JSON.
 */
function formatearDatos(datos: unknown): string {

    if (datos instanceof Error) {
        // El stack ya incluye "name: message" en la primera línea.
        return datos.stack ?? `${datos.name}: ${datos.message}`;
    }

    try {
        return JSON.stringify(datos, null, 4);
    } catch {
        return String(datos);
    }
}

/**
 * Registra un evento (nivel INFO por defecto).
 * Se mantiene por compatibilidad con el uso existente.
 */
export function crearEvento(
    descripcion: string,
    datos?: unknown
): void {
    escribirRegistro("INFO", descripcion, datos);
}

/**
 * Registra un evento con un nivel específico.
 * Usado por el interceptor de consola.
 */
export function registrarEvento(
    nivel: NivelEvento,
    descripcion: string,
    datos?: unknown
): void {
    escribirRegistro(nivel, descripcion, datos);
}
