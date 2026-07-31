import { Inject, inject, Injectable, runInInjectionContext, signal, Type } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { DialogoContenedorComponent } from "./dialogo.contenedor";
import { Subject } from "rxjs";
import { clases } from "../app.config";
import { EnvironmentInjector } from '@angular/core';

export interface AbrirDialogo {
  titulo: string;
  icono: string;
  referencia: any,
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  disableClose?: boolean;
  data?: any,
  alFinalizar?: (resultado: any) => void;
  clase?: string
}

export interface Dialogo {
  id: string;
  titulo: string;
  icono: string;
  datos: any;
  parametros: any;
  // Estado de filtros
  filtros?: any[];
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
  private _dialogos = signal<Dialogo[]>([]);
  dialogos = this._dialogos.asReadonly();

  private matDialogo = inject(MatDialog);

  private registro = new Map<string, Type<any>>();

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

    const dialogos: Dialogo[] = JSON.parse(datos);

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

  public abrir(abrirDialogo: AbrirDialogo): any {

    const id = crypto.randomUUID()
    const nombrePanel = abrirDialogo.referencia.name

    const referencia =
      this.matDialogo.open(
        DialogoContenedorComponent,
        {
          width: abrirDialogo.width ?? 'auto',
          maxWidth: abrirDialogo.maxWidth ?? 'auto',
          maxHeight: abrirDialogo.maxHeight ?? 'auto',
          height: abrirDialogo.height ?? 'auto',
          disableClose: abrirDialogo.disableClose ?? true,
          data: {
            id,
            titulo: abrirDialogo.titulo,
            icono: abrirDialogo.icono,
            componente: abrirDialogo.referencia,
            data: abrirDialogo.data
          }
        }
      );

    const dialogo: Dialogo = {
      id,
      titulo: this.generarTitulo(abrirDialogo.titulo),
      icono: abrirDialogo.icono,
      datos: abrirDialogo.data,
      filtros: [],
      // Movimiento
      posicionX: 0,
      posicionY: 0,
      ancho: 0,
      alto: 0,
      expandido: false,
      minimizado: false,
      parametros: abrirDialogo.data,
      referencia: nombrePanel,
      alFinalizar: abrirDialogo.alFinalizar?.name,
      clase: abrirDialogo.clase
    };
    this._dialogos.update(lista => [
      ...lista,
      dialogo
    ]);
    this.guardar();


    const resultadoDialogo = new Subject<any>();

    referencia.afterClosed()
      .subscribe((respuesta) => {
        if (respuesta?.resultado === 'M') {

          this.actualizarEstadoContenedor(
            dialogo.id,
            {
              minimizado: true
            }
          );

          return;
        }


        if (respuesta?.resultado === 'C' || respuesta === undefined || respuesta === '') {

          this.eliminar(dialogo.id);

          if (dialogo.alFinalizar != undefined) {

            const instancia = this.obtenerInstancia(dialogo.clase ?? '');

            const metodo = dialogo.alFinalizar;

            if (
              metodo &&
              typeof instancia[metodo] === 'function'
            ) {

              instancia[metodo](
                respuesta.resultadoDialogo
              );

            } else {
              console.warn(
                `No existe el método ${metodo} en ${dialogo.clase}`
              );
            }

          }

          resultadoDialogo.next(
            respuesta?.resultadoDialogo
          );
          resultadoDialogo.complete();
        }

      });

    return {
      afterClosed: () => resultadoDialogo.asObservable(),
      close: (valor?: any) => {
        referencia.close(valor);
      }
    };
  }

  private generarTitulo(titulo: string): string {
    const existentes = this._dialogos()
      .filter(x => x.titulo.startsWith(titulo));
    if (existentes.length === 0) {
      return titulo;
    }
    return `${titulo} ${existentes.length + 1}`;
  }

  public restaurar(id: string): any {
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

    const resultadoDialogo = new Subject<any>();

    referencia.afterClosed()
      .subscribe((respuesta) => {
        if (respuesta?.resultado === 'M') {

          this.actualizarEstadoContenedor(
            dialogo.id,
            {
              minimizado: true
            }
          );

          return;
        }


        if (respuesta?.resultado === 'C' || respuesta === undefined || respuesta === '') {

          this.eliminar(dialogo.id);

          resultadoDialogo.next(
            respuesta?.resultadoDialogo
          );
          resultadoDialogo.complete();
        }

      });

    return {
      afterClosed: () => resultadoDialogo.asObservable(),
      close: (valor?: any) => {
        referencia.close(valor);
      }
    };
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

  private obtenerInstancia(nombre: string): any | undefined {

    const clase = this.registro.get(nombre);

    if (!clase) {
      return undefined;
    }

    return runInInjectionContext(
      this.injector,
      () => new clase()
    );
  }

  private obtenerClase(nombre: string): Type<any> | undefined {
    return this.registro.get(nombre);
  }

}


