import { Directive, effect, untracked, WritableSignal } from '@angular/core';
import { DialogoBase } from './dialogo.base';

@Directive()
export abstract class Panel extends DialogoBase {

    public abstract datos: WritableSignal<any[]>;
    public abstract filtros: WritableSignal<any>;
    public filtrosObjeto: any;

    constructor() {
        super();
        effect(() => {
            const estado = {
                datos: this.datos(),
                filtros: {
                    busqueda: this.filtros().texto
                }
            };
            untracked(() => {
                this.actualizarDialogo(estado);
            });
        });
    }

    override cargar(): void {
        if (
            'filtros' in this &&
            this.filtros &&
            typeof this.filtros === 'function'
        ) {
            if ('filtros' in this && this.filtrosObjeto?.busqueda) {
                this.filtros.update(filtro => ({
                    ...filtro,
                    texto: this.filtrosObjeto.busqueda
                }));
            }
        }

        if (!this.datos().length) {
            this.iniciar();
        }

    }


    protected iniciar(): void {
    }


}