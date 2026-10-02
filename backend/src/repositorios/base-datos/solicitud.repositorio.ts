import { prisma } from '../../recursos/prisma';

export interface Solicitud {
    descripcion: string;
    medioContacto?: string;
}

export async function crear(solicitud: Solicitud) {

    await prisma.solicitudes.create({
        data: {
            descripcion: solicitud.descripcion.trim(),
            medio_contacto: solicitud.medioContacto
                ? solicitud.medioContacto.trim()
                : null,
            estatus: true
        }
    });

}
