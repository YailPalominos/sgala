import { Directive, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { RegistroInstancias } from './dialogo.registro';

@Directive()
export abstract class Dialogo {

    public parametros: any;
    public catalogos: any;
    public datos: any;

    private cambioEstado = new Subject<any>();
    public cambioEstado$ = this.cambioEstado.asObservable();

    private cerrarDialogo = new Subject<any>();
    public cerrarDialogo$ = this.cerrarDialogo.asObservable();


    private readonly registro = inject(RegistroInstancias);
    
    constructor() {
        this.registro.registrar(this);
    }

    ngOnDestroy(): void {
        this.registro.eliminar(this);
    }


    /**
     * Cada panel llama esto cuando cambia algo
     */
    protected actualizarDialogo(
        estado: any
    ): void {
        this.cambioEstado.next({
            ...estado
        });
    }

    public cargar(): void {
    }

    protected cerrar(resultado?: any): void {
        this.cerrarDialogo.next(resultado);
    }

}