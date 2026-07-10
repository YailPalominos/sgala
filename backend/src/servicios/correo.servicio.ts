import nodemailer from 'nodemailer';
import { entorno } from '../configuracion/entorno';

/**
 * URL base del frontend para construir enlaces de recuperación.
 */
const URL_FRONTEND = 'http://localhost:4200';

/**
 * Crea un transporter de Nodemailer configurado con las variables de entorno SMTP.
 */
function crearTransporter() {
  return nodemailer.createTransport({
    host: entorno.SMTP_HOST,
    port: entorno.SMTP_PUERTO,
    secure: entorno.SMTP_PUERTO === 465,
    auth: {
      user: entorno.SMTP_USUARIO,
      pass: entorno.SMTP_CONTRASENA,
    },
  });
}

/**
 * Envía un correo electrónico de recuperación de contraseña al usuario.
 *
 * Construye un enlace con la llave de recuperación y lo envía al correo proporcionado.
 * Si el envío falla, lanza un error que será manejado por el servicio de autenticación.
 *
 * @param correo - Dirección de correo electrónico del destinatario
 * @param llave - Llave de recuperación (UUID) generada para el flujo de cambio de contraseña
 */
export async function enviarCorreoRecuperacion(correo: string, llave: string): Promise<void> {
  const transporter = crearTransporter();

  const enlaceRecuperacion = `${URL_FRONTEND}/recuperacion/cambiar?llave=${llave}`;

  await transporter.sendMail({
    from: entorno.SMTP_USUARIO,
    to: correo,
    subject: 'SGALA - Recuperación de contraseña',
    html: `
      <h2>Recuperación de contraseña</h2>
      <p>Has solicitado restablecer tu contraseña en SGALA.</p>
      <p>Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
      <p><a href="${enlaceRecuperacion}">${enlaceRecuperacion}</a></p>
      <p>Este enlace expira en 3 minutos.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `,
  });
}
