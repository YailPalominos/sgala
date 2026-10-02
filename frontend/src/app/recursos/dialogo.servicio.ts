import { Inject, inject, Injectable, runInInjectionContext, signal, Type } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { DialogoContenedorComponent } from "./dialogo.contenedor";
import { clases } from "../app.config";
import { EnvironmentInjector } from '@angular/core';
import { Formulario } from "./dialogo.formulario";
import { Panel } from "./dialogo.panel";
import { Dialogo } from "./dialogo.base";
import { RegistroInstancias } from "./dialogo.registro";

export type ClaseDialogo =
  | (new (...args: any[]) => Dialogo)
  | (new (...args: any[]) => Formulario)
  | (new (...args: any[]) => Panel);

export interface ConfiguracionDialogo {
  titulo: string;
  icono: string;
  referencia: ClaseDialogo;

  // Datos minimos para el contenedor
  /** Width - tamaño horizontal del diálogo */
  largo?: string;
  /** Height - tamaño vertical del diálogo */
  ancho?: string;
  maximoLargo?: string;
  maximoAncho?: string;
  desactivarAutocerrado?: boolean;

  // Datos que se pasan al dialogo
  datos?: any,
  parametros?: any;

  alFinalizar?: (resultado: any) => void;
  clase?: string;

  /** Si es true, el diálogo se persiste y puede minimizarse. Por defecto: true */
  recordar?: boolean;
}

export interface EstadoDialogo {
  id: string;
  titulo: string;
  icono: string;

  datos: any;
  parametros: any;
  filtros: any;

  // Posición final del diálogo
  posicionX: number;
  posicionY: number;
  // Tamaño final del diálogo
  ancho: number;
  alto: number;
  // Estado visual
  expandido: boolean;
  minimizado: boolean;
  // Configuracion
  referencia: string,
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  disableClose?: boolean;
  data?: any,
  alFinalizar?: string,
  clase?: string;

  /** Si es true, el diálogo se persiste y puede minimizarse. */
  recordar: boolean;
}

@Injectable({ providedIn: 'root' })
export class DialogoServicio {
  private claveStorage = 'dialogos';
  private _dialogos = signal<EstadoDialogo[]>([]);
  dialogos = this._dialogos.asReadonly();

  private matDialogo = inject(MatDialog);

  private registro = new Map<string, Type<any>>();
  private registroInstancias = inject(RegistroInstancias)
  private callbacks = new Map<string, (resultado: any) => void>();
  private referencias = new Map<string, any>();

  constructor(
    @Inject(clases)
    clasesRegistradas: Type<any>[],
    private injector: EnvironmentInjector
  ) {

    for (const clase of clasesRegistradas) {
      this.registro.set(
        clase.name,
        clase
      );
    }

    const datos = localStorage.getItem(this.claveStorage);

    if (!datos) {
      return;
    }

    const dialogos: EstadoDialogo[] = JSON.parse(datos);

    const actualizados = dialogos.map(dialogo => ({
      ...dialogo,
      minimizado: true
    }));

    this._dialogos.set(actualizados);

    localStorage.setItem(
      this.claveStorage,
      JSON.stringify(actualizados)
    );
  }

  public eliminar(id: string) {

    const ref = this.referencias.get(id);
    if (ref) {
      ref.close();
      this.referencias.delete(id);
    }

    this._dialogos.update(x =>
      x.filter(d => d.id !== id)
    );

    this.guardar();
  }

  /**
   * Cierra todos los diálogos abiertos y elimina
   * los datos persistidos en el almacenamiento local.
   */
  public eliminarTodos(): void {

    for (const ref of this.referencias.values()) {
      ref.close();
    }

    this.referencias.clear();
    this.callbacks.clear();

    this._dialogos.set([]);

    localStorage.removeItem(this.claveStorage);
  }

  public actualizarTitulo(id: string, titulo: string) {

    this._dialogos.update(x =>
      x.map(d =>
        d.id === id
          ? { ...d, titulo }
          : d
      )
    );

    this.guardar();
  }

  private guardar(): void {

    const datos = this._dialogos()
      .filter(d => d.recordar)
      .map(d => ({
        id: d.id,
        titulo: d.titulo,
        icono: d.icono,
        datos: d.datos,
        filtros: d.filtros,
        posicionX: d.posicionX,
        posicionY: d.posicionY,
        ancho: d.ancho,
        alto: d.alto,
        expandido: d.expandido,
        minimizado: d.minimizado,
        referencia: d.referencia,
        width: d.width,
        height: d.height,
        maxWidth: d.maxWidth,
        maxHeight: d.maxHeight,
        disableClose: d.disableClose,
        parametros: d.parametros,
        alFinalizar: d.alFinalizar,
        clase: d.clase,
        recordar: d.recordar
      }));

    localStorage.setItem(
      this.claveStorage,
      JSON.stringify(datos)
    );
  }

  /**
   * Determina el tipo de pantalla actual.
   * 'c' celular | 'm' tablet | 'l' computadora
   */
  private obtenerTipoPantalla(): 'c' | 'm' | 'l' {
    const ancho = window.innerWidth;

    if (ancho <= 599) {
      return 'c';
    }

    if (ancho <= 1023) {
      return 'm';
    }

    return 'l';
  }

  /**
   * Resuelve el ancho del diálogo según el tipo de pantalla.
   *
   * Acepta:
   * - Formato responsivo: 'l30%,m50%,c100%'
   * - Valor único: '450px' o '50%' (se usa igual en todas)
   * - undefined: no se define ancho (solo aplica el mínimo de 320px)
   *
   * Devuelve el ancho a aplicar, undefined si no hay definido,
   * o 'maximizado' si debe abrirse expandido.
   */
  private resolverLargo(largo?: string): string | 'maximizado' | undefined {

    const tipo = this.obtenerTipoPantalla();

    // En celular siempre maximizado
    if (tipo === 'c') {
      return 'maximizado';
    }

    if (!largo) {
      return undefined;
    }

    // Formato responsivo: contiene comas o prefijos l/m/c
    if (/[lmc]\s*\d/.test(largo)) {

      const partes = largo.split(',').map(p => p.trim());

      const mapa: Record<string, string> = {};

      for (const parte of partes) {
        const coincidencia = parte.match(/^([lmc])\s*(.+)$/);
        if (coincidencia) {
          mapa[coincidencia[1]] = coincidencia[2];
        }
      }

      // Buscar el valor del tipo actual, con fallback a los otros definidos
      return mapa[tipo] ?? mapa['l'] ?? mapa['m'] ?? undefined;
    }

    // Valor único (px o %)
    return largo;
  }

  private generarUUID(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x'
          ? r
          : (r & 0x3 | 0x8);

        return v.toString(16);
      }
    );
  }

  abrir(
    configuracionDialogo: ConfiguracionDialogo
  ) {

    const id = this.generarUUID();
    const nombrePanel = configuracionDialogo.referencia.name
    const referencia = configuracionDialogo.referencia;

    const esFormulario =
      Formulario.prototype.isPrototypeOf(referencia.prototype);

    const esPanel =
      Panel.prototype.isPrototypeOf(referencia.prototype);

    const esDialogo =
      Dialogo.prototype.isPrototypeOf(referencia.prototype);

    if (!esFormulario && !esPanel && !esDialogo) {
      throw new Error(
        `${referencia.name} debe extender Formulario, Panel o Dialogo para ser usado por el servicio de dialogos.`
      );
    }

    const largoResuelto = this.resolverLargo(configuracionDialogo.largo);
    const abrirMaximizado = largoResuelto === 'maximizado';

    const dialogo: EstadoDialogo = {
      id,
      titulo: this.generarTitulo(configuracionDialogo.titulo),
      icono: configuracionDialogo.icono,
      //Genericos
      datos: configuracionDialogo.datos,
      parametros: configuracionDialogo.parametros,
      filtros: [],
      // datos por defecto
      posicionX: 0,
      posicionY: 0,
      ancho: 0,
      alto: 0,
      expandido: abrirMaximizado,
      minimizado: false,
      // Referencias para abri 
      referencia: nombrePanel,
      width: abrirMaximizado ? undefined : largoResuelto,
      height: configuracionDialogo.ancho ?? (esPanel ? '80vh' : undefined),
      maxWidth: configuracionDialogo.maximoLargo,
      maxHeight: configuracionDialogo.maximoAncho,
      disableClose: configuracionDialogo.desactivarAutocerrado,
      alFinalizar: configuracionDialogo.alFinalizar?.name,
      clase: configuracionDialogo.clase,
      recordar: configuracionDialogo.recordar ?? true
    };

    if (configuracionDialogo.alFinalizar) {
      this.callbacks.set(id, configuracionDialogo.alFinalizar);
    }

    this._dialogos.update(lista => [
      ...lista,
      dialogo
    ]);
    this.guardar();
    this.abrirDialogo(dialogo.id);
  }


  private generarTitulo(titulo: string): string {
    const existentes = this._dialogos()
      .filter(x => x.titulo.startsWith(titulo));
    if (existentes.length === 0) {
      return titulo;
    }
    return `${titulo} ${existentes.length + 1}`;
  }

  public abrirDialogo(id: string) {
    const dialogo =
      this._dialogos()
        .find(d => d.id === id);

    if (!dialogo) {
      throw new Error('No existe el dialogo: ' + id);
    }

    const componente = this.obtenerClase(dialogo.referencia);

    this.actualizarEstadoContenedor(
      dialogo.id,
      {
        minimizado: false
      }
    );

    const referencia =
      this.matDialogo.open(
        DialogoContenedorComponent,
        {
          width:
            dialogo.width,
          minWidth: '320px',
          maxWidth:
            dialogo.maxWidth ?? '100vw',
          maxHeight:
            dialogo.maxHeight ?? '100vh',
          height:
            dialogo.height ?? 'auto',
          disableClose:
            dialogo.disableClose ?? true,
          data: {
            id,
            titulo: dialogo.titulo,
            icono: dialogo.icono,
            data: dialogo.parametros,
            posicionX: dialogo.posicionX,
            posicionY: dialogo.posicionY,
            ancho: dialogo.ancho,
            alto: dialogo.alto,
            expandido: dialogo.expandido,
            minimizado: dialogo.minimizado,
            componente,
            datos: dialogo.datos,
            filtros: dialogo.filtros,
            recordar: dialogo.recordar
          }
        }
      );

    this.referencias.set(id, referencia);


    referencia.afterClosed()
      .subscribe((resultado) => {
        if (resultado?.resultado === 'M') {

          if (!dialogo.recordar) {
            this.eliminar(dialogo.id);
            return;
          }

          this.actualizarEstadoContenedor(
            dialogo.id,
            {
              minimizado: true
            }
          );

          return;
        }

        if (resultado?.resultado === 'C') {
          const callback = this.callbacks.get(dialogo.id);

          if (callback) {
            callback(resultado?.resultadoDialogo);
          } else if (dialogo.clase && dialogo.alFinalizar) {
            const instancia = this.obtenerInstancia(dialogo.clase);

            if (instancia && dialogo.alFinalizar) {
              const funcion = instancia[dialogo.alFinalizar as keyof typeof instancia];

              if (typeof funcion === 'function') {
                funcion.call(instancia, resultado?.resultadoDialogo);
              }
            }
          }
        }

        this.callbacks.delete(dialogo.id);
        this.referencias.delete(dialogo.id);
        this.eliminar(dialogo.id);
      });
  }

  public estaMinimizado(id: string): boolean {
    const dialogo = this._dialogos().find(d => d.id === id);
    if (!dialogo) {
      throw new Error(`No se encontró el diálogo con id "${id}".`);
    }
    return dialogo.minimizado;
  }

  public actualizarEstadoDialogo(
    id: string,
    cambios: {
      datos?: any;
      filtros?: any;
    }
  ): void {

    this._dialogos.update(lista => {

      const actualizados = lista.map(dialogo => {

        if (dialogo.id !== id) {
          return dialogo;
        }

        return {
          ...dialogo,
          datos: cambios.datos ?? dialogo.datos,
          filtros: cambios.filtros ?? dialogo.filtros
        };

      });


      localStorage.setItem(
        this.claveStorage,
        JSON.stringify(actualizados)
      );

      return actualizados;
    });

  }

  public actualizarEstadoContenedor(
    id: string,
    cambios: {
      posicionX?: number;
      posicionY?: number;
      ancho?: number;
      alto?: number;
      expandido?: boolean;
      minimizado?: boolean;
    }

  ): void {

    this._dialogos.update(lista => {

      const actualizados = lista.map(dialogo => {

        if (dialogo.id !== id) {
          return dialogo;
        }


        return {
          ...dialogo,

          posicionX:
            cambios.posicionX ?? dialogo.posicionX,

          posicionY:
            cambios.posicionY ?? dialogo.posicionY,


          ancho:
            cambios.ancho ?? dialogo.ancho,

          alto:
            cambios.alto ?? dialogo.alto,


          expandido:
            cambios.expandido ?? dialogo.expandido,


          minimizado:
            cambios.minimizado ?? dialogo.minimizado
        };

      });

      localStorage.setItem(
        this.claveStorage,
        JSON.stringify(actualizados)
      );

      return actualizados;

    });

  }


  private obtenerInstancia(nombre: string): Dialogo | undefined {

    // Intentar obtener una instancia ya existente
    const instancia = this.registroInstancias.obtener(nombre);

    if (instancia) {
      return instancia;
    }

    // Si no existe, obtener la clase registrada
    const clase = this.registro.get(nombre);

    if (!clase) {
      return undefined;
    }

    // Crear una nueva instancia
    const nuevaInstancia = runInInjectionContext(
      this.injector,
      () => new clase()
    );

    // Registrarla para reutilizarla posteriormente
    this.registroInstancias.registrar(nuevaInstancia);

    return nuevaInstancia;
  }


  private obtenerClase(nombre: string): Type<any> | undefined {
    return this.registro.get(nombre);
  }

}
