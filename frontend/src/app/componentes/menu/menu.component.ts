import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RUTAS_NAVEGACION_ADMINISTRADOR } from "../../recursos/constantes";
import { MatTabsModule } from "@angular/material/tabs";
import { RouterModule } from "@angular/router";

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        RouterModule
    ],
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class Menu {

    rutas = RUTAS_NAVEGACION_ADMINISTRADOR;


}