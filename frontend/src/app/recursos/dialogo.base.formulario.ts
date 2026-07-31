import { Directive } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DialogoBase } from './dialogo.base';

@Directive()
export abstract class Formulario extends DialogoBase {

    public abstract formulario: FormGroup;
    public datos: any;

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