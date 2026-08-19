import sql from 'mssql';
import dayjs from 'dayjs';
import { pool } from '../../recursos/base-datos';
import { obtenerSesion } from '@/interceptores/solicitud';

export interface Evento {
    idUsuario: string;
    descripcion: number;
    fecha: Date;
    idElemento: number | null;
    tipo: string | null;
}

export async function crear(descripcion: string): Promise<void> {

    const sesion = obtenerSesion()

    await pool.request()
        .input(
            'descripcion',
            sql.VarChar(1000),
            descripcion.trim()
        )
        .input(
            'fecha',
            sql.DateTime,
            dayjs().toDate()
        )
        .input(
            'idUsuario',
            sql.Int,
            sesion?.idUsuario ?? null
        )
        .query(`
            INSERT INTO eventos (
                descripcion,
                fecha,
                id_usuario
            )
            VALUES (
                @descripcion,
                @fecha,
                @idUsuario
            )
        `);
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

    const request = pool.request()
        .input('idUsuario', sql.Int, idUsuario);

    let condiciones = `
        WHERE e.id_usuario = @idUsuario
    `;

    if (filtros.fechaInicial) {
        condiciones += `
            AND CAST(e.fecha AS DATE) >= @fechaInicial
        `;

        request.input(
            'fechaInicial',
            sql.Date,
            filtros.fechaInicial
        );
    }

    if (filtros.fechaFinal) {
        condiciones += `
            AND CAST(e.fecha AS DATE) <= @fechaFinal
        `;

        request.input(
            'fechaFinal',
            sql.Date,
            filtros.fechaFinal
        );
    }

    if (filtros.horaInicial) {
        condiciones += `
            AND CAST(e.fecha AS TIME) >= @horaInicial
        `;

        request.input(
            'horaInicial',
            sql.Time,
            filtros.horaInicial
        );
    }

    if (filtros.horaFinal) {
        condiciones += `
            AND CAST(e.fecha AS TIME) <= @horaFinal
        `;

        request.input(
            'horaFinal',
            sql.Time,
            filtros.horaFinal
        );
    }

    if (filtros.descripcion) {
        condiciones += `
            AND e.descripcion LIKE @descripcion
        `;

        request.input(
            'descripcion',
            sql.VarChar(1000),
            `%${filtros.descripcion}%`
        );
    }

    const consulta = await request.query(`
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

    ${condiciones}

    ORDER BY e.fecha DESC, e.id;
`);

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
    return consulta.recordset;
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

    const consulta = await pool.request()
        .input(
            'idElemento',
            sql.Int,
            idElemento
        )
        .query(`
            SELECT
                actual.tabla,

                actual.tipo AS tipo_consultado,
                actual.fecha AS fecha_consultado,
                actual.datos AS datos_consultados,

                usuario.alias AS alias_usuario,

                anterior.tipo AS tipo_anterior,
                anterior.fecha AS fecha_anterior,
                anterior.datos AS datos_anteriores,
                anterior.alias_usuario AS alias_usuario_anterior

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

            WHERE actual.id = @idElemento;
        `);

    if (consulta.recordset.length === 0) {
        throw new Error(
            `No se encontraron los datos del elemento con el Id:${idElemento}`
        );
    }

    const registro = consulta.recordset[0];

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