import { Injectable, signal } from '@angular/core';
import {
  temas,
  Tema,
  TEMA_POR_DEFECTO,
  CLAVE_TEMA_STORAGE,
  CLAVE_TEMA_SUGERIDO_STORAGE,
  TEMA_POR_MES
} from './constantes';

/**
 * Gestiona el tema visual de la aplicación.
 *
 * - Aplica la clase `tema-<clave>` al <body>.
 * - Persiste la clave del tema en localStorage.
 * - Expone la clave activa como signal para que la UI reaccione
 *   (por ejemplo, para resolver rutas de imágenes por tema).
 */
@Injectable({ providedIn: 'root' })
export class TemaServicio {

  /** Clave del tema activo (reactiva). */
  public readonly temaActivo = signal<string>(TEMA_POR_DEFECTO);

  /**
   * Carga el tema guardado y lo aplica.
   * Debe llamarse al iniciar la aplicación.
   */
  public inicializar(): void {
    const guardado = localStorage.getItem(CLAVE_TEMA_STORAGE);
    const clave = this.esClaveValida(guardado) ? guardado! : TEMA_POR_DEFECTO;
    this.aplicar(clave, false);
  }

  /**
   * Aplica un tema: cambia la clase del body, actualiza el favicon
   * y, si se indica, lo guarda en localStorage.
   */
  public aplicar(clave: string, guardar: boolean = true): void {

    if (!this.esClaveValida(clave)) {
      clave = TEMA_POR_DEFECTO;
    }

    const body = document.body;

    // Quitar clases de tema previas.
    for (const tema of temas) {
      body.classList.remove(`tema-${tema.clave}`);
    }

    // El institucional no necesita clase (usa :root por defecto),
    // pero la agregamos igual para consistencia.
    body.classList.add(`tema-${clave}`);

    this.temaActivo.set(clave);

    this.actualizarFavicon(clave);

    if (guardar) {
      localStorage.setItem(CLAVE_TEMA_STORAGE, clave);
    }
  }

  /**
   * Resuelve la ruta de una imagen según el tema activo.
   *
   * El tema institucional ('IN') usa las imágenes de la raíz de /public.
   * Los demás temas usan la carpeta /<clave>/.
   *
   * @param nombre nombre del archivo, por ejemplo 'logo_sgala.svg'
   */
  public rutaImagen(nombre: string): string {
    const clave = this.temaActivo();

    if (clave === TEMA_POR_DEFECTO) {
      return `/${nombre}`;
    }

    return `/${clave}/${nombre}`;
  }

  /**
   * Devuelve el tema sugerido para el mes actual, o null si:
   * - el mes no tiene tema sugerido,
   * - el usuario ya respondió la sugerencia este mes,
   * - o el tema sugerido ya es el tema activo.
   */
  public obtenerTemaSugeridoDelMes(): Tema | null {
    const ahora = new Date();
    const periodo = `${ahora.getFullYear()}-${ahora.getMonth()}`;

    // Ya respondió (sí o no) para este periodo.
    const respondido = localStorage.getItem(CLAVE_TEMA_SUGERIDO_STORAGE);
    if (respondido === periodo) {
      return null;
    }

    const clave = TEMA_POR_MES[ahora.getMonth()];
    if (!clave) {
      return null;
    }

    // Si ya tiene ese tema aplicado, no tiene sentido sugerirlo.
    if (this.temaActivo() === clave) {
      return null;
    }

    return temas.find(t => t.clave === clave) ?? null;
  }

  /**
   * Marca que el usuario ya respondió a la sugerencia de tema del mes
   * actual, para no volver a preguntar este mes.
   */
  public marcarSugerenciaRespondida(): void {
    const ahora = new Date();
    const periodo = `${ahora.getFullYear()}-${ahora.getMonth()}`;
    localStorage.setItem(CLAVE_TEMA_SUGERIDO_STORAGE, periodo);
  }

  private actualizarFavicon(clave: string): void {
    const enlace = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!enlace) {
      return;
    }

    enlace.href = clave === TEMA_POR_DEFECTO
      ? '/favicon.svg'
      : `/${clave}/favicon.svg`;
  }

  private esClaveValida(clave: string | null): boolean {
    return !!clave && temas.some(t => t.clave === clave);
  }
}
