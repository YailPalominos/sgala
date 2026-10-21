import nodemailer from 'nodemailer';
import path from 'path';
import { entorno } from '../recursos/entorno';

const colores = {
  tinta: '#273036',
  secundario: '#55646c',
  acento: '#8a979e',
  fondo: '#f2f5f6',
  borde: '#dce3e6'
};

function crearTransporter() {
  return nodemailer.createTransport({
    pool: true,
    host: entorno.SMTP_HOST,
    port: Number(entorno.SMTP_PUERTO),
    secure: false,
    auth: { user: entorno.SMTP_USUARIO, pass: entorno.SMTP_CONTRASENA }
  });
}

function escaparHtml(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caracter]!);
}

function plantillaCorreo(titulo: string, preencabezado: string, contenido: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${colores.fondo};font-family:Arial,Helvetica,sans-serif;color:${colores.tinta};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escaparHtml(preencabezado)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colores.fondo};padding:30px 12px"><tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid ${colores.borde};border-radius:14px;overflow:hidden">
        <tr><td style="padding:24px 32px;background:${colores.tinta};text-align:left"><img src="cid:logo-sgala" width="150" alt="SGALA" style="display:block;width:150px;max-width:100%;height:auto;border:0"></td></tr>
        <tr><td style="padding:34px 32px 28px"><p style="margin:0 0 9px;color:${colores.acento};font-size:12px;font-weight:bold;letter-spacing:1.5px">SGALA</p><h1 style="margin:0 0 22px;color:${colores.tinta};font-size:25px;line-height:1.3">${titulo}</h1>${contenido}</td></tr>
        <tr><td style="padding:18px 32px;background:#f8fafb;border-top:1px solid ${colores.borde};color:${colores.secundario};font-size:12px;line-height:1.6">Este mensaje fue enviado automáticamente por SGALA. Si no reconoces esta actividad, puedes ignorarlo.</td></tr>
      </table><p style="margin:16px 0 0;color:${colores.secundario};font-size:11px">© SGALA</p>
    </td></tr></table>
  </body></html>`;
}

function bloqueTexto(texto: string): string {
  return `<p style="margin:0 0 18px;color:${colores.secundario};font-size:15px;line-height:1.7">${texto}</p>`;
}

function boton(enlace: string, texto: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td style="border-radius:7px;background:${colores.tinta}"><a href="${escaparHtml(enlace)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">${escaparHtml(texto)}</a></td></tr></table>`;
}

function correoConLogo(): { filename: string; path: string; cid: string; contentType: string; contentDisposition: 'inline' } {
  return { filename: 'logo_sgala.svg', path: path.resolve(process.cwd(), 'assets', 'logo_sgala.svg'), cid: 'logo-sgala', contentType: 'image/svg+xml', contentDisposition: 'inline' };
}

function enlaceServidor(ruta: string): string {
  const host = entorno.ENLACE_SERVIDOR.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${host}${ruta}`;
}

export async function enviarCorreoConfirmacion(correo: string, clave: string): Promise<void> {
  const enlace = enlaceServidor(`/confirmar?tipo=usuario&codigoVerificacion=${encodeURIComponent(clave)}`);
  await crearTransporter().sendMail({
    from: entorno.SMTP_USUARIO, to: correo, subject: 'SGALA | Confirma tu registro',
    html: plantillaCorreo('Confirma tu registro', 'Activa tu cuenta SGALA',
      bloqueTexto('Gracias por registrarte. Confirma tu correo para activar tu cuenta.') + boton(enlace, 'Confirmar registro') +
      bloqueTexto('Este enlace vence en 24 horas. Después de confirmar tu cuenta, recibirás tu contraseña provisional para iniciar sesión.') +
      bloqueTexto('Si no solicitaste este registro, puedes ignorar este correo.')),
    attachments: [correoConLogo()]
  });
}

export async function enviarCorreoRecuperacion(correo: string, llave: string): Promise<void> {
  const enlace = enlaceServidor(`/restablecer?llave=${encodeURIComponent(llave)}`);
  await crearTransporter().sendMail({
    from: entorno.SMTP_USUARIO, to: correo, subject: 'SGALA | Recuperación de contraseña',
    html: plantillaCorreo('Restablece tu contraseña', 'Solicitud para cambiar la contraseña de tu cuenta',
      bloqueTexto('Recibimos una solicitud para restablecer la contraseña de tu cuenta SGALA.') + boton(enlace, 'Restablecer contraseña') +
      bloqueTexto('Este enlace vence en 3 minutos. Si no solicitaste el cambio, ignora este mensaje; tu contraseña seguirá igual.')),
    attachments: [correoConLogo()]
  });
}

export async function enviarCorreoBienvenida(datos: any): Promise<void> {
  const contenido = bloqueTexto('Tu cuenta se creó correctamente. Usa estas credenciales para iniciar sesión:') +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid ${colores.borde};border-radius:8px"><tr><td style="padding:15px 18px;color:${colores.secundario};font-size:14px;line-height:1.9"><strong style="color:${colores.tinta}">Alias:</strong> ${escaparHtml(datos.alias)}<br><strong style="color:${colores.tinta}">Teléfono:</strong> ${escaparHtml(datos.telefono)}<br><strong style="color:${colores.tinta}">Contraseña provisional:</strong> ${escaparHtml(datos.contrasena)}</td></tr></table>` +
    bloqueTexto('Al iniciar sesión por primera vez, el sistema te pedirá que establezcas una contraseña segura.');
  await crearTransporter().sendMail({
    from: entorno.SMTP_USUARIO, to: datos.direccionCorreoElectronico, subject: 'SGALA | Tu cuenta está lista',
    html: plantillaCorreo(`Bienvenido${datos.alias ? `, ${escaparHtml(datos.alias)}` : ''}`, 'Tu cuenta SGALA se creó correctamente', contenido),
    attachments: [correoConLogo()]
  });
}

export async function enviarCorreoConfirmacionCambios(
  datos: { alias: string; correoAnterior: string; correoNuevo: string }, clave: string
): Promise<void> {
  const enlace = enlaceServidor(`/confirmar?tipo=correo&codigoVerificacion=${encodeURIComponent(clave)}`);
  const contenido = bloqueTexto(`Hola ${escaparHtml(datos.alias)}. Recibimos una solicitud para actualizar el correo asociado a tu cuenta.`) +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border:1px solid ${colores.borde};border-radius:8px"><tr><td style="padding:14px 18px;color:${colores.secundario};font-size:14px;line-height:1.9"><strong style="color:${colores.tinta}">Correo actual:</strong> ${escaparHtml(datos.correoAnterior)}<br><strong style="color:${colores.tinta}">Correo nuevo:</strong> ${escaparHtml(datos.correoNuevo)}</td></tr></table>` +
    bloqueTexto('Confirma que tienes acceso al nuevo correo. El cambio se aplicará después de completar la confirmación.') + boton(enlace, 'Confirmar cambio de correo') +
    bloqueTexto('Este enlace vence en 24 horas. Si no solicitaste este cambio, ignora el mensaje y contacta al administrador si sospechas que tu cuenta está comprometida.');
  await crearTransporter().sendMail({
    from: entorno.SMTP_USUARIO, to: datos.correoNuevo, subject: 'SGALA | Confirma tu nuevo correo',
    html: plantillaCorreo('Confirma el cambio de correo', 'Confirma el correo electrónico nuevo de tu cuenta', contenido),
    attachments: [correoConLogo()]
  });
}
