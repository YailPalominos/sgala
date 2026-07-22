import sql from 'mssql';
import { pool } from '../recursos/base-datos';

export interface Suscripcion {
    clave?: string;
    tipoTexto: string;
    fechaInicial: Date;
    fechaFinal: Date;
    aliasDispositivo: string;
}

export async function obtenerSuscripcionesDispositivo(claveDispositivo: string): Promise<{ clave: string; nombre: string }[]> {

    const consulta = await pool.request()
        .input('claveDispositivo', sql.VarChar(50), claveDispositivo)
        .query(`
            SELECT
                s.fecha_final AS fechaFinalAnterior
            FROM dispositivos d
            INNER JOIN pre_dispositivos pd
                ON pd.id = d.id_pre_dispositivo
            OUTER APPLY (
                SELECT TOP (1)
                    fecha_final
                FROM suscripciones
                WHERE id_dispositivo = d.id
                ORDER BY fecha_final DESC
            ) s
            WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo);
        `);

    if (consulta.recordset.length === 0) {
        throw new Error('El dispositivo no existe.');
    }

    const esPrimeraSuscripcion = consulta.recordset[0].fechaFinalAnterior == null;

    if (esPrimeraSuscripcion) {
        return [
            {
                clave: 'G',
                nombre: 'Gratis'
            }
        ];
    }

    return [
        {
            clave: 'S',
            nombre: 'Semestral'
        },
        {
            clave: 'A',
            nombre: 'Anual'
        }
    ];
}

export async function obtenerResumenSuscripcionDispositivo(claveDispositivo: string, tipoSuscripcion: string): Promise<any> {

    const consulta = await pool.request()
        .input('claveDispositivo', sql.VarChar(50), claveDispositivo)
        .query(`
            SELECT
                d.id AS idDispositivo,
                GETDATE() AS fechaServidor,
                s.fecha_final AS fechaFinalAnterior,
                pd.cualidades
            FROM dispositivos d
            INNER JOIN pre_dispositivos pd
                ON pd.id = d.id_pre_dispositivo
            OUTER APPLY (
                SELECT TOP (1)
                    fecha_final
                FROM suscripciones
                WHERE id_dispositivo = d.id
                ORDER BY fecha_final DESC
            ) s
            WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo);
        `);

    if (consulta.recordset.length === 0) {
        throw new Error('El dispositivo no existe.');
    }

    const registro = consulta.recordset[0];

    const fechaServidor = new Date(registro.fechaServidor);
    const fechaFinalAnterior = registro.fechaFinalAnterior
        ? new Date(registro.fechaFinalAnterior)
        : null;

    const esPrimeraSuscripcion = fechaFinalAnterior === null;

    // Validar que el tipo solicitado esté permitido
    if (esPrimeraSuscripcion) {
        if (tipoSuscripcion !== 'G') {
            throw new Error('La suscripción seleccionada no está disponible.');
        }
    } else {
        if (tipoSuscripcion !== 'S' && tipoSuscripcion !== 'A') {
            throw new Error('La suscripción seleccionada no está disponible.');
        }
    }

    let fechaInicial = fechaServidor;

    if (fechaFinalAnterior && fechaFinalAnterior > fechaServidor) {
        fechaInicial = fechaFinalAnterior;
    }

    const fechaFinal = new Date(fechaInicial);

    let nombre: string;

    switch (tipoSuscripcion) {
        case 'G':
            nombre = 'Prueba gratuita';
            fechaFinal.setMonth(fechaFinal.getMonth() + 1);
            break;

        case 'S':
            nombre = 'Semestral';
            fechaFinal.setMonth(fechaFinal.getMonth() + 6);
            break;

        case 'A':
            nombre = 'Anual';
            fechaFinal.setFullYear(fechaFinal.getFullYear() + 1);
            break;

        default:
            throw new Error('Tipo de suscripción inválido.');
    }

    return {
        tipoSuscripcion,
        nombre,
        fechaInicial,
        fechaFinal,
        cualidades: registro.cualidades
    };
}

/**
 * Obtiene la fecha final de suscripción actual de un dispositivo.
 * @param claveDispositivo - UUID del dispositivo
 */
export async function obtenerFechaFinalSuscripcion(claveDispositivo: string): Promise<Date | null> {

    const consulta = await pool.request()
        .input('claveDispositivo', sql.VarChar(50), claveDispositivo)
        .query(`
            SELECT
                s.fecha_final AS fechaFinalSuscripcion
            FROM dispositivos d
            INNER JOIN pre_dispositivos pd
                ON pd.id = d.id_pre_dispositivo
            OUTER APPLY (
                SELECT TOP (1)
                    fecha_final
                FROM suscripciones
                WHERE id_dispositivo = d.id
                ORDER BY fecha_final DESC
            ) s
            WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo);
        `);

    if (consulta.recordset.length === 0) {
        throw new Error('El dispositivo no existe.');
    }

    const fechaFinal = consulta.recordset[0].fechaFinalSuscripcion;

    return fechaFinal
        ? new Date(fechaFinal)
        : null;
}

export async function crearSuscripcion(claveDispositivo: string, tipoSuscripcion: string): Promise<void> {

    // Valida que la suscripción solicitada sea posible
    const suscripcion = await obtenerResumenSuscripcionDispositivo(
        claveDispositivo,
        tipoSuscripcion
    );

    // Obtener id del dispositivo
    const consulta = await pool.request()
        .input('claveDispositivo', sql.VarChar(50), claveDispositivo)
        .query(`
            SELECT d.id
            FROM dispositivos d
            INNER JOIN pre_dispositivos pd
                ON pd.id = d.id_pre_dispositivo
            WHERE pd.clave = TRY_CONVERT(uniqueidentifier, @claveDispositivo);
        `);

    if (consulta.recordset.length === 0) {
        throw new Error('El dispositivo no existe.');
    }

    const idDispositivo = consulta.recordset[0].id;

    await pool.request()
        .input('idDispositivo', sql.Int, idDispositivo)
        .input('tipo', sql.Char(1), suscripcion.tipoSuscripcion)
        .input('fechaInicial', sql.DateTime, suscripcion.fechaInicial)
        .input('fechaFinal', sql.DateTime, suscripcion.fechaFinal)
        .query(`
            INSERT INTO suscripciones (
                id_dispositivo,
                tipo,
                fecha_inicial,
                fecha_final
            )
            VALUES (
                @idDispositivo,
                @tipo,
                @fechaInicial,
                @fechaFinal
            );
        `);
}

export async function obtenerSuscripciones(idUsuario: number): Promise<Suscripcion[]> {
    const consulta = await pool.request()
        .input('idUsuario', sql.Int, idUsuario)
        .query(`
            SELECT
                CASE s.tipo
                    WHEN 'G' THEN 'Prueba gratuita'
                    WHEN 'S' THEN 'Semestral'
                    WHEN 'A' THEN 'Anual'
                END AS tipoTexto,
                s.fecha_inicial AS fechaInicial,
                s.fecha_final AS fechaFinal,
                d.alias AS aliasDispositivo,
                s.clave
            FROM suscripciones s
            INNER JOIN dispositivos d
                ON d.id = s.id_dispositivo
            WHERE d.id_usuario = @idUsuario
            ORDER BY s.fecha_final DESC;
        `);
    return consulta.recordset;
}