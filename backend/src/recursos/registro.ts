import { registrarEvento, NivelEvento } from "./evento";

/**
 * Intercepta los métodos de console para que, además de imprimir en la
 * terminal, cada mensaje se guarde como evento en archivos de texto
 * (eventos/AAAA/MM/DD.txt), incluidos los errores.
 *
 * Equivale a configurar el logging al arrancar la aplicación: se llama
 * una sola vez en index.ts y a partir de ahí TODOS los console.log,
 * console.info, console.warn, console.error y console.debug quedan
 * registrados automáticamente, sin modificar las llamadas existentes.
 */

/** Métodos de consola interceptados y su nivel de registro. */
const METODOS: Array<{ nombre: ClaveConsola; nivel: NivelEvento }> = [
    { nombre: "log", nivel: "INFO" },
    { nombre: "info", nivel: "INFO" },
    { nombre: "warn", nivel: "WARN" },
    { nombre: "error", nivel: "ERROR" },
    { nombre: "debug", nivel: "DEBUG" },
];

type ClaveConsola = "log" | "info" | "warn" | "error" | "debug";

/** Guarda las referencias originales para seguir imprimiendo en consola. */
const originales: Partial<Record<ClaveConsola, (...args: any[]) => void>> = {};

let activado = false;

/**
 * Convierte los argumentos de console.* en una descripción de texto
 * y, si hay objetos/errores, los separa como "datos" adicionales.
 */
function componerMensaje(argumentos: any[]): { descripcion: string; datos?: unknown } {

    const partesTexto: string[] = [];
    const datosAdicionales: unknown[] = [];

    for (const argumento of argumentos) {
        if (
            typeof argumento === "string" ||
            typeof argumento === "number" ||
            typeof argumento === "boolean" ||
            argumento === null ||
            argumento === undefined
        ) {
            partesTexto.push(String(argumento));
        } else {
            // Objetos y errores se guardan como datos y se referencian en el texto.
            datosAdicionales.push(argumento);
            if (argumento instanceof Error) {
                partesTexto.push(`[Error: ${argumento.message}]`);
            } else {
                partesTexto.push("[objeto]");
            }
        }
    }

    return {
        descripcion: partesTexto.join(" ").trim() || "(sin mensaje)",
        datos: datosAdicionales.length === 0
            ? undefined
            : datosAdicionales.length === 1
                ? datosAdicionales[0]
                : datosAdicionales
    };
}

/**
 * Activa el guardado automático de todos los logs del sistema.
 * Llamar una sola vez al iniciar la aplicación.
 */
export function iniciarRegistroDeConsola(): void {

    if (activado) {
        return;
    }
    activado = true;

    for (const { nombre, nivel } of METODOS) {

        // Guardar el método original.
        originales[nombre] = console[nombre].bind(console);

        console[nombre] = (...argumentos: any[]): void => {

            // 1. Imprimir en la terminal como siempre.
            originales[nombre]?.(...argumentos);

            // 2. Guardar como evento. Protegido para no romper la app
            //    ni provocar recursión si la escritura falla.
            try {
                const { descripcion, datos } = componerMensaje(argumentos);
                registrarEvento(nivel, descripcion, datos);
            } catch {
                // Si falla el guardado, no interrumpir la ejecución.
            }
        };
    }

    // Capturar también errores no controlados y promesas rechazadas.
    process.on("uncaughtException", (error) => {
        try {
            registrarEvento("ERROR", "uncaughtException", error);
        } catch { }
        originales.error?.("❌ uncaughtException:", error);
    });

    process.on("unhandledRejection", (razon) => {
        try {
            registrarEvento("ERROR", "unhandledRejection", razon);
        } catch { }
        originales.error?.("❌ unhandledRejection:", razon);
    });
}
