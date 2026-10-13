import { Component, Input, OnChanges, ViewChild, SimpleChanges, signal, Output, EventEmitter, WritableSignal, effect, TemplateRef } from '@angular/core';
import { FormsModule, FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltip } from "@angular/material/tooltip";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SelectionModel } from '@angular/cdk/collections';
import { JsonPipe, NgTemplateOutlet } from '@angular/common';

export interface Boton<T = unknown> {
  icono?: string;
  texto?: string;
  /**
   * Dónde se renderiza el botón dentro de una columna de acciones:
   * - 'encabezado': una sola vez en el header de la columna (sin fila).
   * - 'fila' (por defecto): en cada fila.
   */
  posicion?: 'encabezado' | 'fila';
  /**
   * Tipo de botón:
   * - 'boton' (por defecto): botón de acción normal; requiere `accion`.
   * - 'expandible': la tabla gestiona sola el expandir/contraer. En 'fila'
   *   alterna esa fila; en 'encabezado' alterna todas. No requiere accion,
   *   tooltip, icono ni estado (la tabla los resuelve automáticamente).
   */
  tipo?: 'boton' | 'expandible';
  accion?: (fila?: T) => void;
  visible?: (fila: any) => boolean;
  estado?: (fila: any) => boolean;
  tooltip?: (fila: any) => string;
  estilos?: (fila: any) => string;
}

/** Validaciones opcionales para columnas editables ('entrada' / 'fecha-editable'). */
export interface ValidacionColumna {
  /** El valor no puede quedar vacío. */
  requerido?: boolean;
  /** Expresión regular que debe cumplir el valor (solo 'entrada'). */
  patron?: string | RegExp;
  /** Máscara ngx-mask a aplicar en el input (solo 'entrada'). */
  mascara?: string;
  separadorMiles?: string;
  separadorDecimal?: '.' | ',' | ['.', ','];
  conservarSeparadores?: boolean;
  mayusculas?: boolean;
}

export interface Columna {
  clave: string;       // key del objeto
  titulo: string;      // texto del header
  // Formato para mostrar/editar los datos:
  // - 'texto' | 'fecha' | 'decimal' | 'moneda': solo lectura (se muestran formateados).
  // - 'botones': columna de acciones.
  // - 'entrada': celda editable como un input de texto (modifica fila[clave]).
  // - 'fecha-editable': celda con datepicker; al pulsarla se abre el calendario.
  // - 'check': celda con checkbox editable (guarda 1/0 en fila[clave]).
  formato: 'texto' | 'fecha' | 'decimal' | 'moneda' | 'botones' | 'entrada' | 'fecha-editable' | 'check';
  formatoPorFila?: (fila: any) => Columna['formato'];
  validacionPorFila?: (fila: any) => ValidacionColumna | undefined;
  estilos?: string,
  botones?: Boton[]
  /** Validaciones para columnas editables. */
  validacion?: ValidacionColumna;
}

export interface Filtros {
  etiqueta: string;
  marcador: string;
  texto: string;
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
    MatTooltip,
    FormsModule,
    ReactiveFormsModule,
    NgxMaskDirective,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    NgTemplateOutlet,
    JsonPipe
  ],
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss']

})
export class TablaComponent implements OnChanges {
  @Input() datos: any[] = [];
  @Input() columnas: Columna[] = [];
  @Input() filtros!: WritableSignal<Filtros>;

  /**
   * Modelo de selección (SelectionModel del padre). Cuando se proporciona y
   * `seleccionActiva` es true, la tabla muestra una columna de checkbox al
   * inicio (uno por fila y uno en el encabezado para seleccionar todos). Al
   * ser el mismo modelo del padre, éste puede leer `modeloSeleccion.selected`.
   */
  @Input() modeloSeleccion?: SelectionModel<any>;

  /** Activa/desactiva la columna de selección (checkbox). */
  @Input() seleccionActiva = false;

  /** Fila actualmente seleccionada (resaltada) al hacer click. */
  public filaSeleccionada: any = null;

  /** Emite la fila seleccionada al hacer click sobre ella. */
  @Output() seleccion = new EventEmitter<any>();

  /**
   * Emite cuando se edita el valor de una celda (formato 'entrada' o
   * 'fecha-editable'). El objeto de la fila ya viene con el nuevo valor,
   * por lo que el padre puede reaccionar (p. ej. marcar cambios).
   */
  @Output() edicion = new EventEmitter<{ fila: any; clave: string; valor: any }>();

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) tabla!: MatTable<any>;

  dataSource = new MatTableDataSource<any>([]);

  /** Filas actualmente expandidas (por referencia del objeto de la fila). */
  private filasExpandidas = new Set<any>();

  /** Emite cuando cambia el estado de expansión (fila puntual o global). */
  @Output() expansion = new EventEmitter<{ fila: any | null; expandida: boolean }>();

  @Input() mostrarPaginador: boolean = true
  @Input() contenidoDetalle?: TemplateRef<any>;

  constructor(
    private paginatorIntl: MatPaginatorIntl,
    private sanitizer: DomSanitizer
  ) {
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

    effect(() => {

      if (!this.filtros) {
        return;
      }


      const texto = this.filtros()
        .texto
        .trim()
        .toLowerCase();


      this.dataSource.filter = texto;


      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }

    });

  }

  get columnasKeys(): string[] {
    const claves = this.columnas.map(c => c.clave);
    // La columna de selección se antepone cuando el modo está activo.
    if (this.mostrarSeleccion) {
      return ['seleccion', ...claves];
    }
    return claves;
  }

  /** ¿Debe mostrarse la columna de checkbox de selección? */
  public get mostrarSeleccion(): boolean {
    return this.seleccionActiva && !!this.modeloSeleccion;
  }

  /**
   * Resuelve el estilo de una celda. `columna.estilos` puede ser:
   * - un nombre de propiedad de la fila (p. ej. 'estiloTiempoActivo'): se usa
   *   el valor de esa propiedad, permitiendo estilos por fila.
   * - una cadena CSS literal (p. ej. 'display:flex'): se aplica tal cual.
   */
  public estiloCelda(fila: any, columna: Columna): string {
    const estilos = columna.estilos;
    if (!estilos) {
      return '';
    }
    // Si la fila tiene una propiedad con ese nombre, es un estilo por fila.
    if (fila && Object.prototype.hasOwnProperty.call(fila, estilos)) {
      return fila[estilos] ?? '';
    }
    return estilos;
  }

  /**
   * Estilo del encabezado: solo se aplica cuando `columna.estilos` es una
   * cadena CSS literal (contiene ':'). Si es un nombre de propiedad por fila
   * (estilo por fila), el encabezado no lo aplica.
   */
  public estiloEncabezado(columna: Columna): string {
    const estilos = columna.estilos;
    if (!estilos) {
      return '';
    }
    return estilos.includes(':') ? estilos : '';
  }

  /** Selecciona (resalta) la fila y notifica al componente padre. */
  public seleccionarFila(fila: any): void {
    this.filaSeleccionada = fila;
    this.seleccion.emit(fila);
  }

  /** Deselecciona la fila (doble clic rápido) y notifica al padre. */
  public deseleccionarFila(): void {
    this.filaSeleccionada = null;
    this.seleccion.emit(null);
  }

  /**
   * Aplica el nuevo valor editado a la fila y notifica al padre.
   * Se usa por las celdas de formato 'entrada' y 'fecha-editable'.
   */
  public editarCelda(fila: any, clave: string, valor: any): void {
    fila[clave] = valor;
    this.edicion.emit({ fila, clave, valor });
  }

  /** Cache de FormControls por celda (una instancia estable por fila+columna). */
  private controles = new WeakMap<any, Map<string, FormControl>>();

  /**
   * Devuelve (creando si hace falta) el FormControl de una celda editable,
   * con los validadores definidos en la columna. Se reutiliza la misma
   * instancia para que el estado 'touched'/'invalid' persista entre renders.
   */
  public controlCelda(fila: any, columna: Columna): FormControl {
    let porColumna = this.controles.get(fila);
    if (!porColumna) {
      porColumna = new Map<string, FormControl>();
      this.controles.set(fila, porColumna);
    }

    let control = porColumna.get(columna.clave);
    if (!control) {
      const columnaFila = {
        ...columna,
        validacion: this.validacionCelda(fila, columna)
      };
      control = new FormControl(fila[columna.clave], this.construirValidadores(columnaFila));
      // Al cambiar el valor del control (incluida la mascara ngx-mask), se
      // refleja en la fila y se notifica al padre. Asi evitamos un (input)
      // manual que compite con el procesamiento de la mascara.
      control.valueChanges.subscribe(valor => {
        fila[columna.clave] = valor;
        this.edicion.emit({ fila, clave: columna.clave, valor });
      });
      porColumna.set(columna.clave, control);
    }
    return control;
  }

  /** Construye la lista de validadores de Angular a partir de columna.validacion. */
  private construirValidadores(columna: Columna): ValidatorFn[] {
    const validadores: ValidatorFn[] = [];
    const v = columna.validacion;
    if (!v) {
      return validadores;
    }
    if (v.requerido) {
      validadores.push(Validators.required);
    }
    if (v.patron) {
      validadores.push(Validators.pattern(v.patron));
    }
    return validadores;
  }

  /**
   * Aplica el valor del control a la fila (si el control existe) y notifica.
   * Se llama desde el (ngModelChange)/(dateChange) de la celda.
   */
  public editarCeldaControl(fila: any, columna: Columna, valor: any): void {
    const control = this.controlCelda(fila, columna);
    control.setValue(valor);
    control.markAsTouched();
    this.editarCelda(fila, columna.clave, valor);
  }

  public normalizarEntrada(control: FormControl, columna: Columna, fila?: any): void {
    if (!this.validacionCelda(fila, columna)?.mayusculas) {
      return;
    }
    const valor = String(control.value ?? '').toUpperCase();
    if (valor !== control.value) {
      control.setValue(valor, { emitEvent: true });
    }
  }

  /** Columnas que son editables y por tanto tienen validaciones. */
  private get columnasEditables(): Columna[] {
    return this.columnas.filter(
      c => c.formato === 'entrada' || c.formato === 'fecha-editable' || !!c.formatoPorFila
    );
  }

  /**
   * Valida TODAS las celdas editables de la tabla. Marca como 'touched' las
   * inválidas para que se muestre la raya roja y devuelve true solo si todas
   * cumplen sus validaciones. El padre lo usa antes de guardar.
   */
  public validarCeldas(): boolean {
    if (this.columnasEditables.length === 0) {
      return true;
    }

    let todoValido = true;
    for (const fila of this.dataSource.data) {
      for (const columna of this.columnas) {
        if (this.formatoCelda(fila, columna) !== 'entrada' &&
          this.formatoCelda(fila, columna) !== 'fecha-editable') {
          continue;
        }
        const control = this.controlCelda(fila, columna);
        // Aseguramos que el control tenga el valor actual de la fila.
        control.setValue(fila[columna.clave], { emitEvent: false });
        control.markAsTouched();
        control.updateValueAndValidity({ emitEvent: false });
        if (control.invalid) {
          todoValido = false;
        }
      }
    }
    return todoValido;
  }

  public formatoCelda(fila: any, columna: Columna): Columna['formato'] {
    return columna.formatoPorFila?.(fila) ?? columna.formato;
  }

  public validacionCelda(fila: any, columna: Columna): ValidacionColumna | undefined {
    return columna.validacionPorFila?.(fila) ?? columna.validacion;
  }

  /** Botones de una columna filtrados por su posición (encabezado/fila). */
  public botonesPorPosicion(columna: Columna, posicion: 'encabezado' | 'fila'): Boton[] {
    const botones = columna.botones ?? [];
    if (posicion === 'encabezado') {
      return botones.filter(b => b.posicion === 'encabezado');
    }
    // 'fila' incluye los que no declaran posición (por defecto van en la fila).
    return botones.filter(b => b.posicion !== 'encabezado');
  }

  // ============================================================
  // SELECCIÓN DE FILAS (checkbox)
  // ============================================================

  /** ¿Están todas las filas (de la vista filtrada) seleccionadas? */
  public todasSeleccionadas(): boolean {
    if (!this.modeloSeleccion) {
      return false;
    }
    const filas = this.dataSource.filteredData ?? [];
    return filas.length > 0 && filas.every(f => this.modeloSeleccion!.isSelected(f));
  }

  /** Estado "indeterminado" del checkbox del encabezado (algunas, no todas). */
  public algunaSeleccionada(): boolean {
    if (!this.modeloSeleccion) {
      return false;
    }
    const filas = this.dataSource.filteredData ?? [];
    const seleccionadas = filas.filter(f => this.modeloSeleccion!.isSelected(f)).length;
    return seleccionadas > 0 && seleccionadas < filas.length;
  }

  /** Selecciona/deselecciona todas las filas de la vista filtrada. */
  public alternarTodasSeleccion(): void {
    if (!this.modeloSeleccion) {
      return;
    }
    const filas = this.dataSource.filteredData ?? [];
    if (this.todasSeleccionadas()) {
      filas.forEach(f => this.modeloSeleccion!.deselect(f));
    } else {
      filas.forEach(f => this.modeloSeleccion!.select(f));
    }
  }

  /** Alterna la selección de una fila. */
  public alternarSeleccionFila(fila: any): void {
    this.modeloSeleccion?.toggle(fila);
  }

  /** ¿La fila está seleccionada? */
  public estaSeleccionada(fila: any): boolean {
    return this.modeloSeleccion?.isSelected(fila) ?? false;
  }

  // ============================================================
  // EXPANSIÓN DE FILAS (botones tipo 'expandible')
  // ============================================================

  /** ¿Existe al menos un botón 'expandible' en las columnas? */
  public get tieneExpansion(): boolean {
    return this.columnas.some(
      c => (c.botones ?? []).some(b => b.tipo === 'expandible')
    );
  }

  /** ¿La fila dada está expandida? */
  public estaExpandida(fila: any): boolean {
    return this.filasExpandidas.has(fila);
  }

  /**
   * Predicado para matRowDef 'when': la fila de detalle solo se renderiza si
   * la fila está expandida. Firma requerida por Angular Material.
   */
  public estaExpandidaFn = (_indice: number, fila: any): boolean => {
    return this.filasExpandidas.has(fila);
  };

  /** ¿Todas las filas (de la vista filtrada) están expandidas? */
  public todasExpandidas(): boolean {
    const filas = this.dataSource.filteredData ?? [];
    return filas.length > 0 && filas.every(f => this.filasExpandidas.has(f));
  }

  /** Alterna la expansión de una fila puntual. */
  public alternarFila(fila: any): void {
    if (this.filasExpandidas.has(fila)) {
      this.filasExpandidas.delete(fila);
      this.expansion.emit({ fila, expandida: false });
    } else {
      this.filasExpandidas.add(fila);
      this.expansion.emit({ fila, expandida: true });
    }
    this.refrescarFilas();
  }

  /** Alterna la expansión de todas las filas (desde el encabezado). */
  public alternarTodas(): void {
    const filas = this.dataSource.filteredData ?? [];
    const expandir = !this.todasExpandidas();

    if (expandir) {
      filas.forEach(f => this.filasExpandidas.add(f));
    } else {
      this.filasExpandidas.clear();
    }

    this.expansion.emit({ fila: null, expandida: expandir });
    this.refrescarFilas();
  }

  /**
   * Fuerza a MatTable a re-renderizar las filas para que re-evalúe el
   * predicado 'when' del matRowDef de detalle. Cambiar el Set de expandidas
   * no dispara ese re-render por sí solo; reasignar los datos sí lo hace.
   */
  private refrescarFilas(): void {
    this.dataSource.data = this.dataSource.data;
    this.actualizarSticky();
  }

  /**
   * Recalcula los estilos de las celdas/filas sticky (encabezado sticky y
   * columna de acciones stickyEnd). Con multiTemplateDataRows el re-render de
   * filas puede invalidar el cálculo sticky de Material, dejando el header de
   * acciones sin fijarse al hacer scroll. Se recalcula en el siguiente ciclo
   * para que corra después de que la tabla haya pintado las filas.
   */
  private actualizarSticky(): void {
    setTimeout(() => {
      if (!this.tabla) {
        return;
      }
      this.tabla.updateStickyHeaderRowStyles();
      this.tabla.updateStickyColumnStyles();
    });
  }

  /** Icono del botón expandible (según estado, para fila o encabezado). */
  public iconoExpansion(esEncabezado: boolean, fila?: any): string {
    const abierto = esEncabezado ? this.todasExpandidas() : this.estaExpandida(fila);
    return abierto ? 'expand_less' : 'expand_more';
  }

  /** Tooltip del botón expandible. */
  public tooltipExpansion(esEncabezado: boolean, fila?: any): string {
    if (esEncabezado) {
      return this.todasExpandidas() ? 'Contraer filas' : 'Expandir filas';
    }
    return this.estaExpandida(fila) ? 'Contraer fila' : 'Expandir fila';
  }

  /**
   * HTML de detalle de una fila, marcado como confiable para poder renderizarlo
   * con [innerHTML] sin que Angular elimine estilos/atributos. El contenido
   * proviene de fila.contenido (generado por la propia app).
   */
  public contenidoFila(fila: any): SafeHtml {
    const html = fila?.contenido ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /** Ejecuta la acción de un botón según su tipo. */
  public ejecutarBoton(boton: Boton, esEncabezado: boolean, fila?: any): void {
    if (boton.tipo === 'expandible') {
      if (esEncabezado) {
        this.alternarTodas();
      } else {
        this.alternarFila(fila);
      }
      return;
    }
    boton.accion?.(esEncabezado ? undefined : fila);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['datos']) {
      // Al recargar datos, las filas expandidas anteriores ya no aplican.
      this.filasExpandidas.clear();
      this.dataSource.data = this.datos;
      setTimeout(() => {
        if (this.sort) this.dataSource.sort = this.sort;
        if (this.paginator) this.dataSource.paginator = this.paginator;
        this.actualizarSticky();
      });
    }
  }

  public formatearCelda(fila: any, columna: Columna): string {

    const valor = fila[columna.clave];
    if (valor === null || valor === undefined) return '-';

    switch (columna.formato) {
      case 'fecha':
        // Una fecha calendario sin hora no debe convertirse desde UTC,
        // porque en zonas horarias negativas puede mostrarse como el día anterior.
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
          return valor;
        }
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

  /**
   * Exporta a Excel el contenido visible de la tabla (respetando el filtro de
   * búsqueda) usando los títulos de las columnas como encabezados. Se excluyen
   * las columnas de acciones ('botones') porque no contienen datos.
   */
  public async exportarExcel(): Promise<void> {

    // Columnas con datos (se omiten las de botones/acciones).
    const columnasDatos = this.columnas.filter(
      c => c.formato !== 'botones'
    );

    if (columnasDatos.length === 0) {
      return;
    }

    // Carga diferida de la librería: xlsx-js-style es pesada, así que se
    // importa dinámicamente solo al exportar para no inflar el bundle inicial.
    const modulo: any = await import('xlsx-js-style');
    const XLSX = modulo.default ?? modulo;

    // Usar los datos filtrados (lo que el usuario está viendo). Si no hay
    // filtro activo, filteredData es igual a todos los datos.
    const filas = this.dataSource.filteredData ?? this.dataSource.data ?? [];

    const datos = filas.map(fila => {
      const registro: Record<string, any> = {};
      for (const columna of columnasDatos) {
        // El título de la columna es el encabezado; el valor se formatea
        // igual que en pantalla para fecha/decimal/moneda.
        registro[columna.titulo] = this.valorExportable(fila, columna);
      }
      return registro;
    });

    const encabezados = columnasDatos.map(c => c.titulo);

    const hoja = XLSX.utils.json_to_sheet(datos, {
      header: encabezados
    });

    // Color del tema principal activo del usuario para el fondo del encabezado.
    const colorTema = this.colorTemaHex();
    const colorTexto = this.colorContrasteHex(colorTema);

    const rango = XLSX.utils.decode_range(hoja['!ref'] ?? 'A1');
    const filaEncabezado = rango.s.r;

    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r: filaEncabezado, c });
      const celda = hoja[ref];
      if (!celda) {
        continue;
      }
      celda.s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: colorTema }
        },
        font: {
          bold: true,
          color: { rgb: colorTexto }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      };
    }

    // Ancho de columnas acorde al contenido (encabezado y valores).
    hoja['!cols'] = encabezados.map((titulo, indice) => {
      let ancho = titulo.length;
      for (const registro of datos) {
        const valor = registro[titulo];
        const largo = valor == null ? 0 : String(valor).length;
        if (largo > ancho) {
          ancho = largo;
        }
      }
      return { wch: Math.min(Math.max(ancho + 2, 10), 60) };
    });

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos');

    const fecha = new Date();
    const marca =
      `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;

    XLSX.writeFile(libro, `tabla_${marca}.xlsx`);
  }

  /**
   * Lee el color primario del tema activo (variable CSS --sicva-primary del
   * body) y lo devuelve como hex de 6 dígitos SIN '#' (formato de xlsx-js-style).
   * Si no se puede resolver, usa un rojo corporativo por defecto.
   */
  private colorTemaHex(): string {
    const valor = getComputedStyle(document.body)
      .getPropertyValue('--sicva-primary')
      .trim();

    const hex = this.normalizarColorHex(valor);
    return hex ?? '273036';
  }

  /**
   * Convierte un color CSS (#rgb, #rrggbb o rgb(...)) a hex de 6 dígitos sin
   * '#'. Devuelve null si no se reconoce.
   */
  private normalizarColorHex(color: string): string | null {
    if (!color) {
      return null;
    }

    // Formato #rgb o #rrggbb.
    const hexMatch = color.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (hexMatch) {
      let h = hexMatch[1];
      if (h.length === 3) {
        h = h.split('').map(x => x + x).join('');
      }
      return h.toUpperCase();
    }

    // Formato rgb(r, g, b) o rgba(r, g, b, a).
    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const r = Number(rgbMatch[1]);
      const g = Number(rgbMatch[2]);
      const b = Number(rgbMatch[3]);
      return [r, g, b]
        .map(n => n.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }

    return null;
  }

  /**
   * Devuelve 'FFFFFF' o '000000' según el color de fondo, para que el texto
   * del encabezado tenga buen contraste. Usa luminancia perceptual.
   */
  private colorContrasteHex(fondoHex: string): string {
    const r = parseInt(fondoHex.substring(0, 2), 16);
    const g = parseInt(fondoHex.substring(2, 4), 16);
    const b = parseInt(fondoHex.substring(4, 6), 16);
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.6 ? '000000' : 'FFFFFF';
  }

  /**
   * Valor de una celda listo para exportar. Reutiliza el mismo formateo que la
   * vista para fecha/decimal/moneda, y devuelve texto plano para el resto.
   * Las columnas 'check' se exportan como Sí/No.
   */
  private valorExportable(fila: any, columna: Columna): any {
    const valor = fila[columna.clave];

    if (columna.formato === 'check') {
      return valor ? 'Sí' : 'No';
    }

    if (valor === null || valor === undefined) {
      return '';
    }

    if (
      columna.formato === 'fecha' ||
      columna.formato === 'decimal' ||
      columna.formato === 'moneda'
    ) {
      return this.formatearCelda(fila, columna);
    }

    return String(valor);
  }

  public filtrar(evento: Event): void {

    const texto = (evento.target as HTMLInputElement)
      .value
      .trim()
      .toLowerCase();


    this.filtros.update(filtro => ({
      ...filtro,
      texto
    }));


    this.dataSource.filter = texto;


    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

  }
}
