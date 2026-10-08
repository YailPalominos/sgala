import crypto from 'crypto';
import forge from 'node-forge';
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

/** Vigencia de los certificados en días. */
const DIAS_VIGENCIA = 825;

/** Tamaño de la llave RSA en bits. */
const TAMANO_LLAVE = 2048;

/**
 * Hosts/IPs que debe cubrir el certificado del servidor (SAN).
 * Se toman de la variable de entorno SERVIDOR_HOSTS (separados por comas)
 * y, si no está, se usa una lista por defecto con las IPs conocidas.
 * El primer host de la lista se usa como Common Name (CN).
 */
function obtenerHostsServidor(): string[] {
  const configurados = (process.env.SERVIDOR_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const base = configurados.length > 0
    ? configurados
    : ['10.1.33.98', '127.0.0.1', 'localhost'];

  // Garantizar localhost/127.0.0.1 para pruebas locales.
  for (const extra of ['127.0.0.1', 'localhost']) {
    if (!base.includes(extra)) {
      base.push(extra);
    }
  }

  return base;
}

/** Determina si una cadena es una dirección IPv4. */
function esIPv4(valor: string): boolean {
  return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(valor);
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
  const base = normalizarDirectorioCertificados(directorio ?? process.env.DIRECTORIO);
  // Todos los certificados viven bajo <DIRECTORIO>/certificados:
  //   certificados/servidor  -> servidor.key, servidor.crt, ca.crt
  //   certificados/clientes/<clave> -> cliente.key, cliente.crt, ca.crt
  // Si el directorio base ya termina en "certificados", no se duplica.
  const directorioCertificados = /[\\/]certificados$/i.test(base)
    ? base
    : path.join(base, 'certificados');
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

/**
 * Genera un número de serie hexadecimal válido para un certificado X.509.
 * El primer byte se fuerza a un valor bajo para evitar interpretaciones
 * de número negativo.
 */
function generarNumeroSerie(): string {
  return '00' + crypto.randomBytes(16).toString('hex');
}

/**
 * Calcula las fechas de validez del certificado a partir de hoy.
 */
function calcularValidez(): { desde: Date; hasta: Date } {
  const desde = new Date();
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + DIAS_VIGENCIA);
  return { desde, hasta };
}

/**
 * Crea un certificado X.509 autofirmado (usado como servidor y CA).
 * Devuelve el PEM de la llave privada y del certificado.
 */
function crearCertificadoAutofirmado(hosts: string[]): { llavePem: string; certificadoPem: string } {
  const parLlaves = forge.pki.rsa.generateKeyPair(TAMANO_LLAVE);

  const certificado = forge.pki.createCertificate();
  certificado.publicKey = parLlaves.publicKey;
  certificado.serialNumber = generarNumeroSerie();

  const { desde, hasta } = calcularValidez();
  certificado.validity.notBefore = desde;
  certificado.validity.notAfter = hasta;

  // El primer host es el Common Name (CN).
  const commonName = hosts[0];
  const atributos = [{ name: 'commonName', value: commonName }];
  certificado.setSubject(atributos);
  certificado.setIssuer(atributos);

  // Subject Alternative Name (SAN): type 7 = IP, type 2 = DNS.
  // Los clientes modernos validan el host contra el SAN.
  const altNames = hosts.map((host) =>
    esIPv4(host)
      ? { type: 7, ip: host }
      : { type: 2, value: host }
  );

  certificado.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
    { name: 'subjectAltName', altNames },
    { name: 'subjectKeyIdentifier' }
  ]);

  // Firma con su propia llave (SHA-256).
  certificado.sign(parLlaves.privateKey, forge.md.sha256.create());

  return {
    llavePem: forge.pki.privateKeyToPem(parLlaves.privateKey),
    certificadoPem: forge.pki.certificateToPem(certificado)
  };
}

/**
 * Crea un certificado de cliente firmado por el certificado del servidor (CA).
 */
function crearCertificadoCliente(
  commonName: string,
  llaveCaPem: string,
  certificadoCaPem: string
): { llavePem: string; certificadoPem: string } {
  const parLlaves = forge.pki.rsa.generateKeyPair(TAMANO_LLAVE);

  const certificadoCa = forge.pki.certificateFromPem(certificadoCaPem);
  const llaveCa = forge.pki.privateKeyFromPem(llaveCaPem);

  const certificado = forge.pki.createCertificate();
  certificado.publicKey = parLlaves.publicKey;
  certificado.serialNumber = generarNumeroSerie();

  const { desde, hasta } = calcularValidez();
  certificado.validity.notBefore = desde;
  certificado.validity.notAfter = hasta;

  certificado.setSubject([{ name: 'commonName', value: commonName }]);
  // El emisor es el certificado del servidor (CA).
  certificado.setIssuer(certificadoCa.subject.attributes);

  certificado.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true }
  ]);

  // Firma con la llave del servidor/CA (SHA-256).
  certificado.sign(llaveCa, forge.md.sha256.create());

  return {
    llavePem: forge.pki.privateKeyToPem(parLlaves.privateKey),
    certificadoPem: forge.pki.certificateToPem(certificado)
  };
}

export function asegurarCertificadosServidor(
  directorio?: string,
  forzar: boolean = false
): RutasCertificadosServidor {
  const rutas = obtenerRutasCertificados(directorio);

  fs.mkdirSync(rutas.directorio, { recursive: true });
  fs.mkdirSync(rutas.servidor, { recursive: true });
  fs.mkdirSync(rutas.clientes, { recursive: true });

  const hayServidor =
    fs.existsSync(rutas.llave) &&
    fs.existsSync(rutas.certificado);


  if (!hayServidor || forzar) {
    const hosts = obtenerHostsServidor();

    try {
      const { llavePem, certificadoPem } = crearCertificadoAutofirmado(hosts);
      fs.writeFileSync(rutas.llave, llavePem);
      fs.writeFileSync(rutas.certificado, certificadoPem);
      // El ca.crt es una copia del certificado autofirmado del servidor.
      fs.writeFileSync(rutas.ca, certificadoPem);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo generar el certificado del servidor. ${detalle}`);
    }
  }

  if (!fs.existsSync(rutas.ca)) {
    fs.copyFileSync(rutas.certificado, rutas.ca);
  }

  return rutas;
}

/**
 * Regenera desde cero los certificados del servidor (y su CA) con el CN
 * y SAN correctos, y elimina los certificados de cliente existentes para
 * que se vuelvan a emitir firmados por la nueva CA.
 *
 * Úsese cuando cambian los hosts/IPs del servidor o para corregir un
 * certificado anterior sin SAN.
 */
export function regenerarCertificadosServidor(directorio?: string): RutasCertificadosServidor {
  const rutas = obtenerRutasCertificados(directorio);

  // Eliminar certificados de cliente previos (quedarán inválidos con la nueva CA).
  if (fs.existsSync(rutas.clientes)) {
    fs.rmSync(rutas.clientes, { recursive: true, force: true });
  }

  // Eliminar servidor y ca para forzar su regeneración.
  for (const archivo of [rutas.llave, rutas.certificado, rutas.ca]) {
    if (fs.existsSync(archivo)) {
      fs.rmSync(archivo, { force: true });
    }
  }

  return asegurarCertificadosServidor(directorio, true);
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
  const ca = path.join(directorioCliente, 'ca.crt');

  if (!fs.existsSync(key) || !fs.existsSync(cert) || !fs.existsSync(ca)) {
    try {
      const llaveCaPem = fs.readFileSync(rutasServidor.llave, 'utf8');
      const certificadoCaPem = fs.readFileSync(rutasServidor.certificado, 'utf8');

      const { llavePem, certificadoPem } = crearCertificadoCliente(
        claveCertificado,
        llaveCaPem,
        certificadoCaPem
      );

      fs.writeFileSync(key, llavePem);
      fs.writeFileSync(cert, certificadoPem);
      fs.copyFileSync(rutasServidor.certificado, ca);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo generar el certificado del cliente ${claveCertificado}. ${detalle}`);
    }
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
