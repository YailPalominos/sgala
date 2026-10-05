import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import tls from 'tls';

export interface RutasCertificadosServidor {
  directorio: string;
  servidor: string;
  clientes: string;
  llave: string;
  certificado: string;
  ca: string;
}

export interface CertificadosCliente {
  clave: string;
  directorio: string;
  key: string;
  cert: string;
  ca: string;
}

export function normalizarDirectorioCertificados(
  directorio: string = process.env.DIRECTORIO ?? path.resolve(process.cwd(), 'certificados')
): string {
  if (!directorio || directorio.trim().length === 0) {
    return path.resolve(process.cwd(), 'certificados');
  }

  let ruta = directorio.trim();

  if (ruta.startsWith('/C:') || ruta.startsWith('/c:')) {
    ruta = ruta.slice(1);
  }

  if (ruta.startsWith('\\C:') || ruta.startsWith('\\c:')) {
    ruta = ruta.slice(1);
  }

  return ruta.replace(/\\/g, '/');
}

export function obtenerRutasCertificados(directorio?: string): RutasCertificadosServidor {
  const directorioCertificados = normalizarDirectorioCertificados(directorio ?? process.env.DIRECTORIO);
  const servidor = path.join(directorioCertificados, 'servidor');
  const clientes = path.join(directorioCertificados, 'clientes');

  return {
    directorio: directorioCertificados,
    servidor,
    clientes,
    llave: path.join(servidor, 'servidor.key'),
    certificado: path.join(servidor, 'servidor.crt'),
    ca: path.join(servidor, 'ca.crt')
  };
}

function ejecutarComandoOpenSsl(argumentos: string[], descripcion: string): void {
  try {
    execFileSync('openssl', argumentos, { stdio: 'ignore' });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo generar el certificado para ${descripcion}. ${detalle}`);
  }
}

export function asegurarCertificadosServidor(directorio?: string): RutasCertificadosServidor {
  const rutas = obtenerRutasCertificados(directorio);

  fs.mkdirSync(rutas.directorio, { recursive: true });
  fs.mkdirSync(rutas.servidor, { recursive: true });
  fs.mkdirSync(rutas.clientes, { recursive: true });

  const hayServidor =
    fs.existsSync(rutas.llave) &&
    fs.existsSync(rutas.certificado);

  if (!hayServidor) {
    const cn = crypto.randomUUID();

    ejecutarComandoOpenSsl(
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-sha256',
        '-days',
        '825',
        '-nodes',
        '-keyout',
        rutas.llave,
        '-out',
        rutas.certificado,
        '-subj',
        `/CN=${cn}`
      ],
      'el certificado del servidor'
    );
  }

  if (!fs.existsSync(rutas.ca)) {
    fs.copyFileSync(rutas.certificado, rutas.ca);
  }

  return rutas;
}

export function leerCertificadosServidor(directorio?: string): tls.TlsOptions {
  const rutas = asegurarCertificadosServidor(directorio);

  return {
    key: fs.readFileSync(rutas.llave),
    cert: fs.readFileSync(rutas.certificado),
    ca: fs.readFileSync(rutas.ca),
    requestCert: true,
    rejectUnauthorized: true
  };
}

export function crearCertificado(clave?: string, directorio?: string): CertificadosCliente {
  const rutasServidor = asegurarCertificadosServidor(directorio);
  const claveCertificado = (clave ?? crypto.randomUUID()).trim();
  const directorioCliente = path.join(rutasServidor.clientes, claveCertificado);

  fs.mkdirSync(directorioCliente, { recursive: true });

  const key = path.join(directorioCliente, 'cliente.key');
  const cert = path.join(directorioCliente, 'cliente.crt');
  const csr = path.join(directorioCliente, 'cliente.csr');
  const ca = path.join(directorioCliente, 'ca.crt');

  if (!fs.existsSync(key) || !fs.existsSync(cert) || !fs.existsSync(ca)) {
    ejecutarComandoOpenSsl(
      [
        'req',
        '-new',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        key,
        '-out',
        csr,
        '-subj',
        `/CN=${claveCertificado}`
      ],
      `el certificado del cliente ${claveCertificado}`
    );

    ejecutarComandoOpenSsl(
      [
        'x509',
        '-req',
        '-in',
        csr,
        '-signkey',
        rutasServidor.llave,
        '-out',
        cert,
        '-days',
        '825',
        '-sha256'
      ],
      `la firma del cliente ${claveCertificado}`
    );

    fs.copyFileSync(rutasServidor.certificado, ca);
    fs.rmSync(csr, { force: true });
  }

  return {
    clave: claveCertificado,
    directorio: directorioCliente,
    key,
    cert,
    ca
  };
}

export function descargarCertificados(clave?: string, directorio?: string): CertificadosCliente {
  return crearCertificado(clave, directorio);
}

export function obtenerCN(certificado?: tls.PeerCertificate | null): string | null {
  if (!certificado) {
    return null;
  }

  const subject = (certificado as any)?.subject;
  if (!subject) {
    return null;
  }

  const cn = subject.CN ?? subject.cn;

  if (Array.isArray(cn)) {
    return cn[0] ?? null;
  }

  if (typeof cn === 'string') {
    return cn.trim() || null;
  }

  return null;
}

export function obtenerClaveDispositivoDesdeCertificado(certificado?: tls.PeerCertificate | null): string | null {
  return obtenerCN(certificado);
}
