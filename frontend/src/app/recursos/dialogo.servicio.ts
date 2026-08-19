import { Inject, inject, Injectable, runInInjectionContext, signal, Type } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { DialogoContenedorComponent } from "./dialogo.contenedor";
import { Subject } from "rxjs";
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
  largo?: string;
  ancho?: string;
  maximoLargo?: string;
  maximoAncho?: string;
  desactivarAutocerrado?: boolean;

  // Datos que se pasan al dialogo
  datos?: any,
  parametros?: any;

  alFinalizar?: (resultado: any) => void;
  clase?: string
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
  clase?: string
}

@Injectable({ providedIn: 'root' })
export class DialogoServicio {
  private claveStorage = 'dialogos';
  private _dialogos = signal<EstadoDialogo[]>([]);
  dialogos = this._dialogos.asReadonly();

  private matDialogo = inject(MatDialog);

  private registro = new Map<string, Type<any>>();
  private registroInstancias = inject(RegistroInstancias)

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

    this._dialogos.update(x =>
      x.filter(d => d.id !== id)
    );

    this.guardar();
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

    const datos = this._dialogos().map(d => ({
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
      clase: d.clase
    }));

    localStorage.setItem(
      this.claveStorage,
      JSON.stringify(datos)
    );
  }

  abrir(
    configuracionDialogo: ConfiguracionDialogo
  ) {

    const id = crypto.randomUUID()
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
      expandido: false,
      minimizado: false,
      // Referencias para abri 
      referencia: nombrePanel,
      alFinalizar: configuracionDialogo.alFinalizar?.name,
      clase: configuracionDialogo.clase
    };
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
            dialogo.width ?? '850px',
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
            filtros: dialogo.filtros
          }
        }
      );


    referencia.afterClosed()
      .subscribe((resultado) => {
        if (resultado?.resultado === 'M') {

          this.actualizarEstadoContenedor(
            dialogo.id,
            {
              minimizado: true
            }
          );

          return;
        }

        if (resultado?.resultado === 'C') {
          if (dialogo.clase && dialogo.alFinalizar) {
            const instancia = this.obtenerInstancia(dialogo.clase);

            if (instancia && dialogo.alFinalizar) {
              const funcion = instancia[dialogo.alFinalizar as keyof typeof instancia];

              if (typeof funcion === 'function') {
                funcion.call(instancia, resultado?.resultadoDialogo);
              }
            }
          }
        }

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
