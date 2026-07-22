import { Injectable, signal, Type } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

export interface DialogoMinimizado {
  id: string;
  titulo: string;
  icono: string;
  filtros: any;
  datos: any;
  referencia: MatDialogRef<any>;
  expandido: boolean;
}

@Injectable({ providedIn: 'root' })
export class DialogoServicio {

  private claveStorage = 'dialogos-minimizados';

  private _dialogos = signal<DialogoMinimizado[]>([]);

  dialogos = this._dialogos.asReadonly();

  constructor() {
    this.cargar();
  }

  private paneles = new Map<string, Type<any>>();


  registrarPanel(
    tipo: string,
    componente: Type<any>
  ): void {
    this.paneles.set(tipo, componente);
  }

  obtenerPanel(tipo: string): Type<any> | undefined {
    return this.paneles.get(tipo);
  }

  agregar(dialogo: DialogoMinimizado) {

    dialogo.titulo = this.generarTitulo(dialogo.titulo);

    const lista = [
      ...this._dialogos(),
      dialogo
    ];

    this._dialogos.set(lista);

    this.guardar();
  }


  eliminar(id: string) {

    this._dialogos.update(x =>
      x.filter(d => d.id !== id)
    );

    this.guardar();
  }


  actualizarTitulo(id: string, titulo: string) {

    this._dialogos.update(x =>
      x.map(d =>
        d.id === id
          ? { ...d, titulo }
          : d
      )
    );

    this.guardar();
  }


  private guardar() {

    const datos = this._dialogos()
      .map(d => ({
        id: d.id,
        titulo: d.titulo,
        icono: d.icono,
        datos: d.datos,
        filtros: d.filtros,
        componente: d.referencia.componentInstance.constructor.name,
        expandido: d.expandido
      }));

    localStorage.setItem(
      this.claveStorage,
      JSON.stringify(datos)
    );
  }


  private cargar() {

    const datos = localStorage.getItem(this.claveStorage);

    if (!datos) {
      return;
    }

    this._dialogos.set(
      JSON.parse(datos)
    );
  }


  private generarTitulo(titulo: string): string {

    const existentes = this._dialogos()
      .filter(x => x.titulo.startsWith(titulo));


    if (existentes.length === 0) {
      return titulo;
    }


    return `${titulo} ${existentes.length + 1}`;
  }

}