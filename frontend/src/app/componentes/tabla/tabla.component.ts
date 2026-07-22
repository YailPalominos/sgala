import { Component, Input, OnChanges, ViewChild, SimpleChanges, signal, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltip } from "@angular/material/tooltip";

export interface Boton<T = unknown> {
  icono: string;
  texto?: string;
  accion: (fila?: T) => void;
  visible?: (fila: any) => boolean;
  estado?: (fila: any) => boolean;
  tooltip?: (fila: any) => string;
}

export interface Columna {
  clave: string;       // key del objeto
  titulo: string;      // texto del header
  formato: 'texto' | 'fecha' | 'decimal' | 'moneda' | 'botones';// Formato para mostrar los datos
  estilos?: string,
  botones?: Boton[]
}

export interface Filtros {
  etiqueta: string;
  marcador: string;
  botones?: Boton[]
}

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatButtonModule,
    MatTooltip
  ],
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss']

})
export class TablaComponent implements OnChanges {
  @Input() datos: any[] = [];
  @Input() columnas: Columna[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<any>([]);

  @Input() filtros!: Filtros;
  @Output() busquedaChange = new EventEmitter<string>();

  textoBusqueda = signal('');

  constructor(private paginatorIntl: MatPaginatorIntl) {
    this.paginatorIntl.itemsPerPageLabel = 'Registros por página';
    this.paginatorIntl.nextPageLabel = 'Página siguiente';
    this.paginatorIntl.previousPageLabel = 'Página anterior';
    this.paginatorIntl.firstPageLabel = 'Primera página';
    this.paginatorIntl.lastPageLabel = 'Última página';

    this.paginatorIntl.getRangeLabel = (
      page: number,
      pageSize: number,
      length: number
    ): string => {
      if (length === 0 || pageSize === 0) {
        return 'Sin registros';
      }

      const totalPaginas = Math.ceil(length / pageSize);
      return `Página ${page + 1} de ${totalPaginas} - ${length} registros`;
    };

    this.paginatorIntl.changes.next();
  }

  get columnasKeys(): string[] {
    return this.columnas.map(c => c.clave);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['datos']) {
      this.dataSource.data = this.datos;
      setTimeout(() => {
        if (this.sort) this.dataSource.sort = this.sort;
        if (this.paginator) this.dataSource.paginator = this.paginator;
      });
    }
  }

  public formatearCelda(fila: any, columna: Columna): string {

    const valor = fila[columna.clave];
    if (valor === null || valor === undefined) return '-';

    switch (columna.formato) {
      case 'fecha':
        const fecha = new Date(valor);
        if (isNaN(fecha.getTime())) return '-';
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        const h = String(fecha.getHours()).padStart(2, '0');
        const min = String(fecha.getMinutes()).padStart(2, '0');
        const s = String(fecha.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}:${s}`;

      case 'decimal':
        return Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      case 'moneda':
        return `$${Number(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      default:
        return String(valor);
    }
  }

  public filtrar(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.textoBusqueda.set(texto);
    this.busquedaChange.emit(texto);
  }

}
