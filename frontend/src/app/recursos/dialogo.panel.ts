import { Directive, effect, signal, untracked, WritableSignal } from '@angular/core';
import { Dialogo } from './dialogo.base';
import { FormGroup } from '@angular/forms';

@Directive()
export abstract class Panel extends Dialogo {

    public registros = signal<any[]>([]);
    public filtros?: WritableSignal<any>;
    public filtrosObjeto: any;

    public panelFiltros?: FormGroup;

    constructor() {
        super();
        effect(() => {
            const estado = {
                datos: this.registros(),
                // filtros: {
                //     busqueda: this.filtros()?.texto
                // }
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

        if (this.registros().length === 0) {
            this.iniciar();
        }
    }


    protected iniciar(): void {
    }

    public restablecer() {
        this.panelFiltros?.reset()
    }

}