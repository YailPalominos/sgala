import { CommonModule } from "@angular/common";
import { Component, Inject, TemplateRef } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";

@Component({
    selector: 'app-filtros',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule
    ],
    templateUrl: './filtros.component.html',
    styleUrls: ['./filtros.component.scss']
})
export class Filtros {



    public formulario = new FormGroup({});

    constructor(
        private referencia: MatDialogRef<Filtros>,
        @Inject(MAT_DIALOG_DATA)
        public cuerpo: TemplateRef<any>
    ) { }

    aceptar() {
        this.referencia.close(
            this.formulario.getRawValue()
        );
    }



    cerrar() {
        this.referencia.close();
    }
}