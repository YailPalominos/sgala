import nodemailer from 'nodemailer';
import { entorno } from '../recursos/entorno';

/**
 * Crea un transporter de Nodemailer configurado con las variables SMTP.
 */
function crearTransporter() {
  return nodemailer.createTransport({
    pool: true,
    host: entorno.SMTP_HOST,
    port: Number(entorno.SMTP_PUERTO),
    secure: false,
    auth: {
      user: entorno.SMTP_USUARIO,
      pass: entorno.SMTP_CONTRASENA,
    },
  });
}

export async function enviarCorreoConfirmacion(correo: string, clave: string): Promise<void> {
  const transporter = crearTransporter();

  const servidor = entorno.ENLACE_SERVIDOR
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  const esIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(servidor);

  const host = esIpv4 || servidor === 'localhost'
    ? `${servidor}:4200`
    : servidor;

  const enlaceConfirmacion =
    `https://${host}/confirmar?tipo=usuario&codigoVerificacion=${encodeURIComponent(clave)}`;

  await transporter.sendMail({
    from: entorno.SMTP_USUARIO,
    to: correo,
    subject: 'SGALA - Confirma tu registro',
    html: `
      <h2>Confirma tu registro en SGALA</h2>

      <p>
        Gracias por registrarte. Para activar tu cuenta,
        confirma tu correo haciendo clic en el siguiente enlace:
      </p>

      <p>
        <a href="${enlaceConfirmacion}">
          Confirmar registro en SGALA
        </a>
      </p>

      <p>Este enlace expira en 24 horas.</p>

      <p>
        Una vez confirmado, recibirás tu contraseña provisional
        para iniciar sesión.
      </p>

      <p>Si no solicitaste este registro, ignora este correo.</p>
    `,
  });
}

export async function enviarCorreoRecuperacion(correo: string, llave: string): Promise<void> {
  const transporter = crearTransporter();

  const servidor = entorno.ENLACE_SERVIDOR
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  const esIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(servidor);

  const host = esIpv4 || servidor === 'localhost'
    ? `${servidor}:4200`
    : servidor;

  const enlaceRecuperacion =
    `https://${host}/restablecer?llave=${encodeURIComponent(llave)}`;

  await transporter.sendMail({
    from: entorno.SMTP_USUARIO,
    to: correo,
    subject: 'SGALA - Recuperación de contraseña',
    html: `
      <h2>Recuperación de contraseña</h2>

      <p>
        Has solicitado restablecer tu contraseña en SGALA.
      </p>

      <p>
        Haz clic en el siguiente enlace para establecer una nueva contraseña:
      </p>

      <p>
        <a href="${enlaceRecuperacion}">
          Restablecer contraseña
        </a>
      </p>

      <p>Este enlace expira en 3 minutos.</p>

      <p>
        Si no solicitaste este cambio, ignora este correo.
      </p>
    `,
  });
}

export async function enviarCorreoBienvenida(datos: any): Promise<void> {
  const transporter = crearTransporter();

  await transporter.sendMail({
    from: entorno.SMTP_USUARIO,
    to: datos.direccionCorreoElectronico,
    subject: 'SGALA - Bienvenido, tu cuenta ha sido creada',
    html: `
      <h2>Bienvenido a SGALA</h2>
      <p>Tu cuenta ha sido creada exitosamente. Usa las siguientes credenciales para iniciar sesión:</p>
      <ul>
        <li><strong>Alias:</strong> ${datos.alias}</li>
        <li><strong>Teléfono:</strong> ${datos.telefono}</li>
        <li><strong>Contraseña provisional:</strong> ${datos.contrasena}</li>
      </ul>
      <p>Al iniciar sesión por primera vez, el sistema te pedirá que establezcas una contraseña segura.</p>
      <p>Si no solicitaste esta cuenta, ignora este correo.</p>
    `,
  });
}


export async function enviarCorreoConfirmacionCambios(
  datos: {
    alias: string;
    correoAnterior: string;
    correoNuevo: string;
  },
  clave: string
): Promise<void> {
  const transporter = crearTransporter();

  const servidor = entorno.ENLACE_SERVIDOR
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  const esIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(servidor);

  const host = esIpv4 || servidor === 'localhost'
    ? `${servidor}:4200`
    : servidor;

  const enlaceConfirmacion =
    `https://${host}/confirmar?tipo=correo&codigoVerificacion=${encodeURIComponent(clave)}`;

  await transporter.sendMail({
    from: entorno.SMTP_USUARIO,
    to: datos.correoNuevo,
    subject: 'SGALA - Confirma el cambio de correo electrónico',
    html: `
      <h2>Confirmación de cambio de correo electrónico</h2>

      <p>
        Hola <strong>${datos.alias}</strong>.
      </p>

      <p>
        Se ha solicitado actualizar el correo electrónico asociado
        a tu cuenta de SGALA.
      </p>

      <h3>Datos de la cuenta</h3>

      <ul>
        <li>
          <strong>Correo actual:</strong>
          ${datos.correoAnterior}
        </li>
        <li>
          <strong>Nuevo correo:</strong>
          ${datos.correoNuevo}
        </li>
      </ul>

      <p>
        Para confirmar que tienes acceso al nuevo correo electrónico,
        haz clic en el siguiente enlace:
      </p>

      <p>
        <a href="${enlaceConfirmacion}">
          Confirmar cambio de correo electrónico
        </a>
      </p>

      <p>
        Este enlace expira en 24 horas.
      </p>

      <p>
        El cambio de correo electrónico no se realizará hasta que
        completes la confirmación.
      </p>

      <p>
        Si no solicitaste este cambio, ignora este correo y,
        si consideras que tu cuenta puede estar comprometida,
        contacta al administrador.
      </p>
    `,
  });
}
