import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { entorno } from "./entorno";

const directorioEventos = path.join(
    entorno.DIRECTORIO,
    "eventos"
);

/**
 * Registra un evento en un archivo de texto.
 */
export function crearEvento(
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

    let contenido = `${fecha.format("HH:mm:ss")} - ${descripcion}`;

    if (datos !== undefined) {
        contenido += `\n${JSON.stringify(datos, null, 4)}`;
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