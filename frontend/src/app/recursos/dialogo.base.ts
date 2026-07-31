import { Directive } from '@angular/core';
import { Subject } from 'rxjs';

@Directive()
export abstract class DialogoBase {

    public parametros: any;

    public catalogos: any;


    private cambioEstado = new Subject<any>();
    public cambioEstado$ = this.cambioEstado.asObservable();

    private cerrarDialogo = new Subject<any>();
    public cerrarDialogo$ = this.cerrarDialogo.asObservable();
    

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