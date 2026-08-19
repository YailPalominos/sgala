import { Inject, inject, Injectable, runInInjectionContext, signal, Type } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { DialogoContenedorComponent } from "./dialogo.contenedor";
import { firstValueFrom, Subject } from "rxjs";
import { clases } from "../app.config";
import { EnvironmentInjector } from '@angular/core';
import { Formulario } from "./dialogo.formulario";
import { Panel } from "./dialogo.panel";
import { Dialogo } from "./dialogo.base";
import { RegistroInstancias } from "./dialogo.registro";
import { Filtros } from "../componentes/filtros/filtros.component";


@Injectable({ providedIn: 'root' })
export class FiltroServicio {


  private matDialogo = inject(MatDialog);

  constructor(
  ) {
  }



  async abrir(cuerpo: any): Promise<any> {

    const referencia = this.matDialogo.open(
      Filtros,
      {
        width: '400px',
        data: cuerpo
      }
    );

    return await firstValueFrom(
      referencia.afterClosed()
    );

  }
}