import { Directive, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Dialogo } from './dialogo.base';

@Directive()
export abstract class Formulario extends Dialogo {

    // Debe ser implementado por la clase hija
    public abstract formulario: FormGroup;

    private estadoInicial: any = null;
    public hayCambios = signal(false);

    constructor() {
        super();
        queueMicrotask(() => {
            this.formulario.valueChanges.subscribe(() => {
                this.actualizarDialogo({
                    datos: this.formulario.getRawValue()
                });
                this.verificarCambios();
            });
        });
    }

    override cargar(): void {
        if (this.datos == undefined) {
            if (this.parametros?.datos) {
                this.formulario.patchValue(
                    this.parametros.datos
                );
            }
        } else {
            this.formulario.patchValue(
                this.datos
            );
            this.formulario.markAllAsTouched();
        }

        // Guardar snapshot después de cargar los datos
        queueMicrotask(() => {
            this.estadoInicial = JSON.stringify(
                this.formulario.getRawValue()
            );
            this.hayCambios.set(false);
        });
    }

    private verificarCambios(): void {
        const estadoActual = JSON.stringify(
            this.formulario.getRawValue()
        );
        this.hayCambios.set(estadoActual !== this.estadoInicial);
    }

    /**
     * Indica si el formulario puede enviarse:
     * debe ser válido y tener cambios reales respecto al estado inicial.
     */
    public puedeEnviar(): boolean {
        return this.formulario.valid && this.hayCambios();
    }

}
