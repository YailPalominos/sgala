import { Prisma } from '@prisma/client';
import { prisma, ejecutarConSesion } from '../../recursos/prisma';
import { obtenerSesion } from '@/interceptores/solicitud';

export interface Dispositivo {
  id: number;
  idUsuario: number;
  idPreDispositivo: number;
  alias: string;
  telefono: string | null;
  clave: string;
}

export interface DatosCrear {
  clave: string;
  alias: string;
  telefono: string;
  idUsuario: number
}

export interface DatosActualizar {
  clave: string;
  telefono: string;
  alias: string;
}

export interface DispositivoClave {
  clave: string;
  idUsuario: number;
  alias: string;
  telefono: string;
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
  telefono: string | null;
  tipo: string;
  tipoTexto: string;
  idUsuario: number | null;
  aliasUsuario: string | null;
  correoUsuario: string | null;
  fechaFinalSuscripcion: Date | null;
}

export interface DatosCrearPreDispositivo {
  tipo: 'I' | 'T' | 'C' | 'D';
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


export async function buscarPorClave(clave: string, idUsuario: number): Promise<any | null> {
  const registros = await prisma.$queryRaw<any[]>`
      SELECT
        pd.id AS idPreDispositivo,
        d.id AS idDispositivo,
        d.id_usuario AS idUsuario,
        d.alias,
        d.telefono
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
    alias: registro.alias,
    telefono: registro.telefono
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
        alias: datos.alias || null as any,
        telefono: datos.telefono || null
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
        dis.alias = ${datos.alias},
        dis.telefono = ${datos.telefono}
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
          dis.telefono,
          prd.cualidades,
          prd.tipo,
          CASE prd.tipo
            WHEN 'I' THEN 'Interruptor'
            WHEN 'T' THEN 'Timbre'
            WHEN 'C' THEN 'Camara'
            WHEN 'D' THEN 'Dispositivo'
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
      dis.telefono,
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
  datos: DatosCrearPreDispositivo
): Promise<PreDispositivoCreado> {
  const resultado = await prisma.$queryRaw<PreDispositivoCreado[]>`
    INSERT INTO dbo.pre_dispositivos (tipo, cualidades, estatus)
    OUTPUT INSERTED.id AS id, INSERTED.clave AS clave
    VALUES (${datos.tipo}, ${datos.cualidades}, 1)
  `;
  return resultado[0];
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

/**
 * Crea una localización del dispositivo
 * @param claveDispositivo Clave del dispositivo
 * @param localizacion Datos de ubicación
 */
export async function crearLocalizacion(
  claveDispositivo: string,
  localizacion: {
    latitud: number;
    longitud: number;
    altitud: number;
  }
): Promise<void> {

  await prisma.$executeRaw`
        INSERT INTO localizaciones (
            id_dispositivo,
            latitud,
            longitud,
            altitud
        )
        SELECT
            d.id,
            ${localizacion.latitud},
            ${localizacion.longitud},
            ${localizacion.altitud}
        FROM dispositivos d
        INNER JOIN pre_dispositivos pd
            ON pd.id = d.id_pre_dispositivo
        WHERE pd.clave = TRY_CONVERT(uniqueidentifier, ${claveDispositivo});
    `;
}

//#endregion
