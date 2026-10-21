import { Prisma } from '@prisma/client';
import { prisma, ejecutarConSesion } from '../../recursos/prisma';
import { obtenerSesion } from '@/interceptores/solicitud';

export interface Dispositivo {
  id: number;
  idUsuario: number;
  idPreDispositivo: number;
  alias: string;
  clave: string;
}

export interface DatosCrear {
  clave: string;
  alias: string;
  idUsuario: number
}

export interface DatosActualizar {
  clave: string;
  alias: string;
}

export interface DispositivoClave {
  clave: string;
  idUsuario: number;
  alias: string;
  tipoTexto: string;
  tipo: string;
  fechaFinalSuscripcion: Date | null;
  cualidades: string;
}

export interface DispositivoAdministrativo {
  id: number;
  clave: string;
  estatus: boolean;
  cualidades: string | null;
  idDispositivo: number | null;
  aliasDispositivo: string | null;
  tipo: string;
  tipoTexto: string;
  idUsuario: number | null;
  aliasUsuario: string | null;
  correoUsuario: string | null;
  fechaFinalSuscripcion: Date | null;
}

export interface DatosCrearPreDispositivo {
  tipo: 'I' | 'T' | 'C' | 'D' | 'M' | 'Y';
  cualidades: string | null;
}

export interface PreDispositivoCreado {
  id: number;
  clave: string;
}

export interface LocalizacionDispositivo {
  aliasDispositivo: string;
  latitud: number;
  longitud: number;
  altitud: number;
}

export interface LocalizacionHistorialDispositivo {
  claveDispositivo: string;
  aliasDispositivo: string;
  latitud: number;
  longitud: number;
  altitud: number;
  fecha: Date;
}


export async function buscarPorClave(clave: string, idUsuario: number): Promise<any | null> {
  const registros = await prisma.$queryRaw<any[]>`
      SELECT
        pd.id AS idPreDispositivo,
        d.id AS idDispositivo,
        d.id_usuario AS idUsuario,
        d.alias
      FROM pre_dispositivos pd
      LEFT JOIN dispositivos d
        ON d.id_pre_dispositivo = pd.id
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, ${clave});
    `;

  if (registros.length === 0) {
    throw new Error('La clave del pre dispositivo no existe.');
  }

  const registro = registros[0];

  // La clave existe pero todavía no está vinculada
  if (!registro.idDispositivo) {
    return;
  }

  // La clave pertenece a otro usuario
  if (registro.idUsuario != idUsuario) {
    throw new Error('No tiene permiso para acceder a este dispositivo.');
  }

  // La clave pertenece al usuario correcto
  return {
    alias: registro.alias
  };
}

export async function crear(datos: DatosCrear) {

  const registros = await prisma.$queryRaw<any[]>`
      SELECT
        pd.id AS idPreDispositivo,
        d.id AS idDispositivo
      FROM pre_dispositivos pd
      LEFT JOIN dispositivos d
        ON d.id_pre_dispositivo = pd.id
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, ${datos.clave});
    `;

  if (registros.length === 0) {
    throw new Error('La clave del pre dispositivo no existe.');
  }

  const registro = registros[0];

  if (registro.idDispositivo) {
    throw new Error('La clave del pre dispositivo ya está siendo utilizada.');
  }

  const sesion = obtenerSesion();

  await ejecutarConSesion(sesion?.idUsuario ?? 0, async (tx) => {
    return tx.dispositivos.create({
      data: {
        id_usuario: datos.idUsuario,
        id_pre_dispositivo: registro.idPreDispositivo,
        alias: datos.alias || null as any
      }
    });
  });
}

export async function actualizar(datos: DatosActualizar): Promise<void> {

  const sesion = obtenerSesion();

  await ejecutarConSesion(sesion?.idUsuario ?? 0, async (tx) => {
    return tx.$executeRaw`
      UPDATE dis
      SET
        dis.alias = ${datos.alias}
      FROM dispositivos dis
      INNER JOIN pre_dispositivos pd
        ON pd.id = dis.id_pre_dispositivo
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, ${datos.clave});
    `;
  });
}

//#region Dispositivos


/**
 * Obtiene los dispositivos asignados a un usuario
 * @param idUsuario Id del usuario
 */
export async function obtenerListaDispositivosUsuario(
  idUsuario: number
): Promise<{ clave: string; alias: string }[]> {

  const registros = await prisma.$queryRaw<{ clave: string; alias: string }[]>`
        SELECT
            prd.clave,
            dis.alias
        FROM dispositivos dis
        INNER JOIN pre_dispositivos prd
            ON prd.id = dis.id_pre_dispositivo
        WHERE dis.id_usuario = ${idUsuario}
          AND prd.estatus = 1
        ORDER BY dis.alias;
    `;

  return registros;
}

export async function obtenerDatosDispositivos(): Promise<DispositivoClave[]> {
  const registros = await prisma.$queryRaw<DispositivoClave[]>`
      SELECT 
          dis.id_usuario AS idUsuario,
          prd.clave,
          sus.fecha_final AS fechaFinalSuscripcion,
          dis.alias,
          prd.cualidades,
          prd.tipo,
          CASE prd.tipo
            WHEN 'I' THEN 'Interruptor'
            WHEN 'T' THEN 'Timbre'
            WHEN 'C' THEN 'Camara'
            WHEN 'D' THEN 'Dispositivo'
            WHEN 'M' THEN 'Modulo'
            WHEN 'Y' THEN 'Telefono'
            ELSE 'Desconocido'
          END AS tipoTexto
      FROM dispositivos dis
      INNER JOIN pre_dispositivos prd
          ON prd.id = dis.id_pre_dispositivo
      OUTER APPLY (
          SELECT TOP 1
              s.fecha_final
          FROM suscripciones s
          WHERE s.id_dispositivo = dis.id
          ORDER BY s.fecha_final DESC
      ) sus
      WHERE prd.estatus = 1;
    `;

  return registros;
}

export async function obtenerListaAdministrativa(): Promise<DispositivoAdministrativo[]> {
  return prisma.$queryRaw<DispositivoAdministrativo[]>`
    SELECT
      prd.id,
      prd.clave,
      prd.estatus,
      prd.cualidades,
      dis.id AS idDispositivo,
      dis.alias AS aliasDispositivo,
      prd.tipo,
      CASE prd.tipo
        WHEN 'I' THEN 'Interruptor'
        WHEN 'T' THEN 'Timbre'
        WHEN 'C' THEN 'Cámara'
        WHEN 'D' THEN 'Dispositivo'
        ELSE 'Desconocido'
      END AS tipoTexto,
      u.id AS idUsuario,
      u.alias AS aliasUsuario,
      u.direccion_correo_electronico AS correoUsuario,
      sus.fecha_final AS fechaFinalSuscripcion
    FROM pre_dispositivos prd
    LEFT JOIN dispositivos dis
      ON prd.id = dis.id_pre_dispositivo
    LEFT JOIN usuarios u
      ON u.id = dis.id_usuario
    OUTER APPLY (
      SELECT TOP 1 s.fecha_final
      FROM suscripciones s
      WHERE s.id_dispositivo = dis.id
      ORDER BY s.fecha_final DESC
    ) sus
    ORDER BY prd.id DESC
  `;
}

export async function crearPreDispositivo(
  datos: any
): Promise<string> {
  const resultado = await prisma.$queryRaw<{ clave: string }[]>`
    DECLARE @salida TABLE (id INT, clave UNIQUEIDENTIFIER);

    INSERT INTO dbo.pre_dispositivos (tipo, cualidades, estatus)
    OUTPUT INSERTED.id, INSERTED.clave
      INTO @salida (id, clave)
    VALUES (${datos.tipo}, ${datos.cualidades}, 1);

    SELECT clave FROM @salida;
  `;

  if (!resultado.length) {
    throw new Error('No se pudo crear el pre-dispositivo.');
  }

  return resultado[0].clave;
}

export async function actualizarPreDispositivo(
  datos: any
): Promise<string> {

  const resultado = await prisma.$queryRaw<{ clave: string }[]>`
    DECLARE @salida TABLE (clave UNIQUEIDENTIFIER);

    UPDATE dbo.pre_dispositivos
    SET
      tipo = ${datos.tipo},
      cualidades = ${datos.cualidades}
    OUTPUT INSERTED.clave INTO @salida (clave)
    WHERE clave = ${datos.clave};

    SELECT clave FROM @salida;
  `;

  if (!resultado.length) {
    throw new Error('No se encontró el pre-dispositivo o no se pudo actualizar.');
  }

  return resultado[0].clave;
}

/**
 * Obtiene las localizaciones acorde a los filtros
 * @param idUsuario Id del usuario que realiza la solicitud
 * @param filtros Filtros para las localizaciones
 */
export async function obtenerLocalizaciones(idUsuario: number, filtros: any): Promise<LocalizacionDispositivo[]> {

  const claveDispositivo = filtros.claveDispositivo ?? null;

  const registros = await prisma.$queryRaw<LocalizacionDispositivo[]>`
        SELECT
            d.alias AS aliasDispositivo,
            l.latitud,
            l.longitud,
            l.altitud
        FROM localizaciones l
        INNER JOIN dispositivos d
            ON d.id = l.id_dispositivo
        INNER JOIN pre_dispositivos pd
            ON pd.id = d.id_pre_dispositivo
        INNER JOIN usuarios u
            ON u.id = d.id_usuario
        WHERE u.id = ${idUsuario}
          AND (
                ${claveDispositivo} IS NULL
                OR pd.clave = TRY_CONVERT(uniqueidentifier, ${claveDispositivo})
              )
        ORDER BY l.id;
    `;

  return registros;
}

/** Obtiene el historial de ruta de los dispositivos del usuario en el rango solicitado. */
export async function obtenerHistorialLocalizaciones(
  idUsuario: number,
  claves: string[],
  fechaInicial?: string,
  fechaFinal?: string
): Promise<LocalizacionHistorialDispositivo[]> {
  if (claves.length === 0) return [];

  return prisma.$queryRaw<LocalizacionHistorialDispositivo[]>`
    SELECT
      pd.clave AS claveDispositivo,
      d.alias AS aliasDispositivo,
      l.latitud,
      l.longitud,
      l.altitud,
      l.fecha
    FROM localizaciones l
    INNER JOIN dispositivos d ON d.id = l.id_dispositivo
    INNER JOIN pre_dispositivos pd ON pd.id = d.id_pre_dispositivo
    WHERE d.id_usuario = ${idUsuario}
      AND pd.clave IN (${Prisma.join(claves)})
      AND (${fechaInicial ?? null} IS NULL OR l.fecha >= TRY_CONVERT(datetime2, ${fechaInicial ?? null}, 126))
      AND (${fechaFinal ?? null} IS NULL OR l.fecha <= TRY_CONVERT(datetime2, ${fechaFinal ?? null}, 126))
    ORDER BY pd.clave, l.fecha;
  `;
}
/**
 * Registra una lista de localizaciones del dispositivo.
 * Solo registra puntos separados al menos 20 metros
 * de la última localización aceptada.
 *
 * id: identificador asignado por el dispositivo.
 * idReplica: identificador asignado por el servidor.
 * idReplica = -1 cuando la localización no se registra.
 * fecha: fecha de la localización enviada por el dispositivo.
 */
export async function crearLocalizaciones(
  claveDispositivo: string,
  localizaciones: {
    id: number;
    latitud: number;
    longitud: number;
    altitud: number;
    fecha: string | Date;
  }[]
): Promise<{
  id: number;
  idReplica: number;
  latitud: number;
  longitud: number;
  altitud: number;
  fecha: string | Date;
}[]> {

  return prisma.$transaction(async (tx) => {

    const resultado: {
      id: number;
      idReplica: number;
      latitud: number;
      longitud: number;
      altitud: number;
      fecha: string | Date;
    }[] = [];

    const dispositivo = await tx.$queryRaw<
      { id: number }[]
    >`
      SELECT d.id
      FROM dispositivos d
      INNER JOIN pre_dispositivos pd
        ON pd.id = d.id_pre_dispositivo
      WHERE pd.clave = TRY_CONVERT(uniqueidentifier, ${claveDispositivo});
    `;

    if (dispositivo.length === 0) {
      throw new Error(
        `No existe el dispositivo ${claveDispositivo}`
      );
    }

    const idDispositivo = dispositivo[0].id;

    const ultimaLocalizacion = await tx.$queryRaw<
      {
        latitud: number;
        longitud: number;
      }[]
    >`
      SELECT TOP (1)
        latitud,
        longitud
      FROM localizaciones
      WHERE id_dispositivo = ${idDispositivo}
      ORDER BY id DESC;
    `;

    let referencia = ultimaLocalizacion[0] ?? null;

    for (const localizacion of localizaciones) {

      let distancia = Infinity;

      if (referencia) {
        const R = 6371000;
        const rad = (grados: number) => grados * Math.PI / 180;

        const lat1 = rad(referencia.latitud);
        const lat2 = rad(localizacion.latitud);

        const deltaLat = rad(
          localizacion.latitud - referencia.latitud
        );

        const deltaLon = rad(
          localizacion.longitud - referencia.longitud
        );

        const a =
          Math.sin(deltaLat / 2) ** 2 +
          Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(deltaLon / 2) ** 2;

        distancia = 2 * R * Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );
      }

      if (distancia < 20) {
        resultado.push({
          ...localizacion,
          idReplica: -1
        });

        continue;
      }

      const registro = await tx.$queryRaw<
        { idReplica: number }[]
      >`
        INSERT INTO localizaciones (
          id_dispositivo,
          latitud,
          longitud,
          altitud,
          fecha
        )
        OUTPUT INSERTED.id AS idReplica
        VALUES (
          ${idDispositivo},
          ${localizacion.latitud},
          ${localizacion.longitud},
          ${localizacion.altitud},
          ${localizacion.fecha instanceof Date
            ? localizacion.fecha
            : new Date(localizacion.fecha)}
        );
      `;

      resultado.push({
        ...localizacion,
        idReplica: registro[0].idReplica
      });

      referencia = localizacion;
    }

    return resultado;
  });
}
