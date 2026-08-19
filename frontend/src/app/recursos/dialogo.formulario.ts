import { Directive } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Dialogo } from './dialogo.base';

@Directive()
export abstract class Formulario extends Dialogo {

    // Debe ser implementado por la clase hija
    public abstract formulario: FormGroup;

    constructor() {
        super();
        queueMicrotask(() => {
            this.formulario.valueChanges.subscribe(() => {
                this.actualizarDialogo({
                    datos: this.formulario.getRawValue()
                });
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
    }


}