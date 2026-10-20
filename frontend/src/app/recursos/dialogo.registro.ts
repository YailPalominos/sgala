import { Injectable, reflectComponentType, Type } from "@angular/core";
import { Dialogo } from "./dialogo.base";

@Injectable({
    providedIn: 'root'
})
export class RegistroInstancias {

    private readonly instancias = new Map<string, Dialogo>();

    registrar(instancia: Dialogo): void {
        this.instancias.set(
            this.obtenerIdentificador(instancia),
            instancia
        );
    }

    eliminar(instancia: Dialogo): void {
        this.instancias.delete(
            this.obtenerIdentificador(instancia)
        );
    }

    obtener<T extends Dialogo>(nombre: string): T | undefined {
        return this.instancias.get(nombre) as T | undefined;
    }

    private obtenerIdentificador(instancia: Dialogo): string {
        const clase = instancia.constructor as Type<any>;
        return reflectComponentType(clase)?.selector ?? clase.name;
    }

}
