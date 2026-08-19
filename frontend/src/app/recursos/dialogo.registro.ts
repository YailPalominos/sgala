import { Injectable } from "@angular/core";
import { Dialogo } from "./dialogo.base";

@Injectable({
    providedIn: 'root'
})
export class RegistroInstancias {

    private readonly instancias = new Map<string, Dialogo>();

    registrar(instancia: Dialogo): void {
        this.instancias.set(
            instancia.constructor.name,
            instancia
        );
    }

    eliminar(instancia: Dialogo): void {
        this.instancias.delete(
            instancia.constructor.name
        );
    }

    obtener<T extends Dialogo>(nombre: string): T | undefined {
        return this.instancias.get(nombre) as T | undefined;
    }

}