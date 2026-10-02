import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../../recursos/prisma';
import { obtenerSesion } from '@/interceptores/solicitud';

export interface Evento {
    idUsuario: string;
    descripcion: number;
    fecha: Date;
    idElemento: number | null;
    tipo: string | null;
}

export async function crear(descripcion: string): Promise<void> {

    const sesion = obtenerSesion();

    await prisma.eventos.create({
        data: {
            descripcion: descripcion.trim(),
            fecha: dayjs().toDate(),
            id_usuario: sesion?.idUsuario ?? null
        }
    });
}


/**
 * Crea un evento del sistema (sin sesión HTTP).
 */
export async function crearEventoSistema(idUsuario: number, descripcion: string): Promise<void> {

    await prisma.eventos.create({
        data: {
            descripcion: descripcion.trim(),
            fecha: dayjs().toDate(),
            id_usuario: idUsuario
        }
    });
}

/**
Obtiene los eventos acorde al usuario y filtros
@param idUsuario Id del usuario que realiza la solicitud
@param filtros Filtros para los eventos
*/
export async function obtenerLista(
    idUsuario: number,
    filtros: any
): Promise<Evento[]> {

    const condiciones: Prisma.Sql[] = [
        Prisma.sql`e.id_usuario = ${idUsuario}`
    ];

    if (filtros.fechaInicial) {
        condiciones.push(Prisma.sql`CAST(e.fecha AS DATE) >= ${filtros.fechaInicial}`);
    }

    if (filtros.fechaFinal) {
        condiciones.push(Prisma.sql`CAST(e.fecha AS DATE) <= ${filtros.fechaFinal}`);
    }

    if (filtros.horaInicial) {
        condiciones.push(Prisma.sql`CAST(e.fecha AS TIME) >= ${filtros.horaInicial}`);
    }

    if (filtros.horaFinal) {
        condiciones.push(Prisma.sql`CAST(e.fecha AS TIME) <= ${filtros.horaFinal}`);
    }

    if (filtros.descripcion) {
        condiciones.push(Prisma.sql`e.descripcion LIKE ${'%' + filtros.descripcion + '%'}`);
    }

    const where = Prisma.join(condiciones, ' AND ');

    const registros = await prisma.$queryRaw<Evento[]>`
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY e.fecha DESC, e.id
            ) AS id,
            e.descripcion,
            e.fecha,
            h.id AS id_elemento,
            h.tipo
        FROM eventos e
        LEFT JOIN historial_registros h
            ON h.id_evento = e.id
        WHERE ${where}
        ORDER BY e.fecha DESC, e.id;
    `;

    function formatearValor(valor: unknown): string {

        if (valor instanceof Date) {
            const fecha = dayjs(valor);

            return fecha.hour() === 0 &&
                fecha.minute() === 0 &&
                fecha.second() === 0
                ? fecha.format('YYYY-MM-DD')
                : fecha.format('YYYY-MM-DD HH:mm:ss');
        }

        if (typeof valor === 'string') {

            const fecha = dayjs(valor);

            if (fecha.isValid()) {

                return fecha.hour() === 0 &&
                    fecha.minute() === 0 &&
                    fecha.second() === 0
                    ? fecha.format('YYYY-MM-DD')
                    : fecha.format('YYYY-MM-DD HH:mm:ss');
            }
        }
        return String(valor);
    }

    await crear(
        `Consultó el Catálogo: Eventos, ${Object.keys(filtros).length === 0
            ? 'Sin filtros'
            : 'con los filtros [' +
            Object.entries(filtros)
                .map(([k, v]) => `${k}:${formatearValor(v)}`)
                .join(', ') +
            ']'
        }`
    );

    return registros;
}

export interface DatosElemento {
    consultado: {
        fecha: Date;
        tipo: 'C' | 'A';
        aliasUsuario: string;
        datos: unknown;
    };

    anterior: {
        fecha: Date;
        tipo: 'C' | 'A';
        aliasUsuario: string;
        datos: unknown;

    } | null;
}
export async function obtenerDatosElemento(
    idElemento: number
): Promise<DatosElemento | null> {

    const registros = await prisma.$queryRaw<any[]>`
        SELECT
            actual.tabla,
            actual.tipo AS tipoConsultado,
            actual.fecha AS fechaConsultado,
            actual.datos AS datosConsultados,
            usuario.alias AS aliasUsuario,
            anterior.tipo AS tipoAnterior,
            anterior.fecha AS fechaAnterior,
            anterior.datos AS datosAnteriores,
            anterior.alias_usuario AS aliasUsuarioAnterior
        FROM historial_registros actual
        INNER JOIN eventos evento
            ON evento.id = actual.id_evento
        LEFT JOIN usuarios usuario
            ON usuario.id = evento.id_usuario
        OUTER APPLY (
            SELECT TOP 1
                h.tipo,
                h.fecha,
                h.datos,
                u.alias AS alias_usuario
            FROM historial_registros h
            INNER JOIN eventos e
                ON e.id = h.id_evento
            LEFT JOIN usuarios u
                ON u.id = e.id_usuario
            WHERE
                h.tabla = actual.tabla
                AND h.id_registro = actual.id_registro
                AND h.id < actual.id
            ORDER BY h.id DESC
        ) anterior
        WHERE actual.id = ${idElemento};
    `;

    if (registros.length === 0) {
        throw new Error(
            `No se encontraron los datos del elemento con el Id:${idElemento}`
        );
    }

    const registro = registros[0];

    function filtrarDatos(datosJson: string | null): unknown {

        if (!datosJson) {
            return null;
        }

        const datos = JSON.parse(datosJson);

        switch (
        registro.tabla
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
        ) {

            case 'usuarios':
                return {
                    alias: datos.alias,
                    direccionCorreoElectronico:
                        datos.direccion_correo_electronico,
                    contrasena: datos.contrasena,
                    estatus: datos.estatus,
                    telefono: datos.telefono
                };

            case 'dispositivos':
                return {
                    alias: datos.alias,
                    telefono: datos.telefono
                };

            default:
                return datos;
        }
    }

    return {
        consultado: {
            fecha: registro.fechaConsultado,
            tipo: registro.tipoConsultado,
            aliasUsuario: registro.aliasUsuario,
            datos: filtrarDatos(registro.datosConsultados)
        },

        anterior: registro.fechaAnterior
            ? {
                fecha: registro.fechaAnterior,
                tipo: registro.tipoAnterior,
                aliasUsuario: registro.aliasUsuarioAnterior,
                datos: filtrarDatos(registro.datosAnteriores)
            }
            : null
    };
}
