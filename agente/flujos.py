from datetime import datetime


FLUJOS = {

    # =========================================================
    # INICIO
    # =========================================================

    'inicio': {
        'contenido': '¡Hola! 👋 Soy el asistente de SGALA. ¿En qué puedo ayudarte?',
        'opciones': [
            {
                'clave': 'Soporte',
                'contenido': '🛠️ Ayuda / Soporte',
                'siguiente': 'soporte'
            },
            {
                'clave': 'Compras',
                'contenido': '🛒 Compras / Mis pedidos',
                'siguiente': 'compras'
            },
            {
                'clave': 'Ventas',
                'contenido': '🛍️ Ventas / Comprar',
                'siguiente': 'ventas'
            }
        ]
    },


    # =========================================================
    # SOPORTE
    # =========================================================

    'soporte': {
        'contenido': '🛠️ Ayuda / Soporte. ¿Qué necesitas consultar?',
        'opciones': [
            {
                'clave': 'Soporte_SGALA',
                'contenido': '💻 Ayuda / SGALA',
                'siguiente': 'soporte_sgala'
            },
            {
                'clave': 'Soporte_Dispositivos',
                'contenido': '📟 Ayuda / Dispositivos',
                'siguiente': 'soporte_dispositivos'
            },
            {
                'clave': 'Soporte_Conexion',
                'contenido': '📡 Ayuda / Conexión',
                'siguiente': 'soporte_conexion'
            },
            {
                'clave': 'Soporte_Usuario',
                'contenido': '👤 Ayuda / Usuario y acceso',
                'siguiente': 'soporte_usuario'
            }
        ]
    },


    # ---------------------------------------------------------
    # SOPORTE SGALA
    # ---------------------------------------------------------

    'soporte_sgala': {
        'contenido': '💻 Ayuda / SGALA. ¿Qué problema necesitas revisar?',
        'opciones': [
            {
                'clave': 'Soporte_SGALA_Ingreso',
                'contenido': '🔐 Ayuda / No puedo ingresar',
                'siguiente': 'soporte_sgala_ingreso'
            },
            {
                'clave': 'Soporte_SGALA_Reportes',
                'contenido': '📊 Ayuda / Reportes',
                'siguiente': 'soporte_sgala_reportes'
            },
            {
                'clave': 'Soporte_SGALA_Recepciones',
                'contenido': '📥 Ayuda / Recepciones',
                'siguiente': 'soporte_sgala_recepciones'
            },
            {
                'clave': 'Soporte_SGALA_Cortes',
                'contenido': '📋 Ayuda / Cortes',
                'siguiente': 'soporte_sgala_cortes'
            }
        ]
    },


    'soporte_sgala_ingreso': {
        'contenido': '🔐 Ayuda / Acceso. ¿Qué sucede?',
        'opciones': [
            {
                'clave': 'Soporte_SGALA_Usuario',
                'contenido': '👤 Ayuda / Problema con usuario',
                'siguiente': 'soporte_usuario'
            },
            {
                'clave': 'Soporte_SGALA_Contraseña',
                'contenido': '🔑 Ayuda / Problema con contraseña',
                'siguiente': 'soporte_sgala_contrasena'
            },
            {
                'clave': 'Soporte_SGALA_Certificado',
                'contenido': '📜 Ayuda / Problema con certificado',
                'siguiente': 'soporte_sgala_certificado'
            }
        ]
    },


    'soporte_sgala_contrasena': {
        'contenido': '🔑 Ayuda / Contraseña. El problema puede continuar con un proceso de recuperación de acceso.',
        'opciones': []
    },


    'soporte_sgala_certificado': {
        'contenido': '📜 Ayuda / Certificado. Revisemos la conexión y el certificado del equipo.',
        'opciones': []
    },


    'soporte_sgala_reportes': {
        'contenido': '📊 Ayuda / Reportes. ¿Qué necesitas consultar?',
        'opciones': [
            {
                'clave': 'Soporte_Reportes_NoGenera',
                'contenido': '❌ Ayuda / El reporte no se genera',
                'siguiente': 'soporte_reportes_no_genera'
            },
            {
                'clave': 'Soporte_Reportes_Informacion',
                'contenido': 'ℹ️ Ayuda / Información incorrecta',
                'siguiente': 'soporte_reportes_informacion'
            },
            {
                'clave': 'Soporte_Reportes_Descarga',
                'contenido': '📄 Ayuda / No puedo descargar',
                'siguiente': 'soporte_reportes_descarga'
            }
        ]
    },


    'soporte_reportes_no_genera': {
        'contenido': '📊 Ayuda / Reportes. Vamos a revisar por qué no se está generando.',
        'opciones': []
    },


    'soporte_reportes_informacion': {
        'contenido': '📊 Ayuda / Reportes. Vamos a revisar la información mostrada.',
        'opciones': []
    },


    'soporte_reportes_descarga': {
        'contenido': '📄 Ayuda / Reportes. Vamos a revisar la descarga del reporte.',
        'opciones': []
    },


    'soporte_sgala_recepciones': {
        'contenido': '📥 Ayuda / Recepciones. ¿Qué problema tienes?',
        'opciones': [
            {
                'clave': 'Soporte_Recepciones_XML',
                'contenido': '📄 Ayuda / XML',
                'siguiente': 'soporte_recepciones_xml'
            },
            {
                'clave': 'Soporte_Recepciones_PDF',
                'contenido': '📄 Ayuda / PDF',
                'siguiente': 'soporte_recepciones_pdf'
            },
            {
                'clave': 'Soporte_Recepciones_Pendientes',
                'contenido': '⏳ Ayuda / Recepciones pendientes',
                'siguiente': 'soporte_recepciones_pendientes'
            }
        ]
    },


    'soporte_recepciones_xml': {
        'contenido': '📄 Ayuda / XML. Vamos a revisar el XML de la recepción.',
        'opciones': []
    },


    'soporte_recepciones_pdf': {
        'contenido': '📄 Ayuda / PDF. Vamos a revisar el documento de la recepción.',
        'opciones': []
    },


    'soporte_recepciones_pendientes': {
        'contenido': '⏳ Ayuda / Recepciones pendientes. Vamos a revisar qué documento falta.',
        'opciones': []
    },


    'soporte_sgala_cortes': {
        'contenido': '📋 Ayuda / Cortes. ¿Qué necesitas revisar?',
        'opciones': [
            {
                'clave': 'Soporte_Cortes_Volumen',
                'contenido': '📊 Ayuda / Volúmenes',
                'siguiente': 'soporte_cortes_volumen'
            },
            {
                'clave': 'Soporte_Cortes_Diferencia',
                'contenido': '⚠️ Ayuda / Diferencias',
                'siguiente': 'soporte_cortes_diferencia'
            }
        ]
    },


    'soporte_cortes_volumen': {
        'contenido': '📊 Ayuda / Volúmenes. Vamos a revisar el volumen registrado.',
        'opciones': []
    },


    'soporte_cortes_diferencia': {
        'contenido': '⚠️ Ayuda / Diferencias. Vamos a revisar la diferencia del corte.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # SOPORTE DISPOSITIVOS
    # ---------------------------------------------------------

    'soporte_dispositivos': {
        'contenido': '📟 Ayuda / Dispositivos. ¿Qué dispositivo necesitas revisar?',
        'opciones': [
            {
                'clave': 'Soporte_Dispositivo_Interruptor',
                'contenido': '🔌 Ayuda / Interruptor',
                'siguiente': 'soporte_interruptor'
            },
            {
                'clave': 'Soporte_Dispositivo_DVR',
                'contenido': '📹 Ayuda / DVR y cámaras',
                'siguiente': 'soporte_dvr'
            },
            {
                'clave': 'Soporte_Dispositivo_Alarma',
                'contenido': '🚨 Ayuda / Alarma vehicular',
                'siguiente': 'soporte_alarma'
            }
        ]
    },


    'soporte_interruptor': {
        'contenido': '🔌 Ayuda / Interruptor. ¿Qué necesitas hacer?',
        'opciones': [
            {
                'clave': 'Soporte_Interruptor_Estado',
                'contenido': '✅ Ayuda / Consultar estado',
                'siguiente': 'soporte_interruptor_estado'
            },
            {
                'clave': 'Soporte_Interruptor_Activar',
                'contenido': '⚡ Ayuda / Activar interruptor',
                'siguiente': 'soporte_interruptor_activar'
            },
            {
                'clave': 'Soporte_Interruptor_Programar',
                'contenido': '⏱️ Ayuda / Programar activación',
                'siguiente': 'soporte_interruptor_programar'
            }
        ]
    },


    'soporte_interruptor_estado': {
        'contenido': '✅ Ayuda / Estado del interruptor. El dispositivo puede identificarse mediante su UUID y su estado actual.',
        'opciones': []
    },


    'soporte_interruptor_activar': {
        'contenido': '⚡ Ayuda / Activar interruptor. Puedes activar el dispositivo desde la aplicación.',
        'opciones': []
    },


    'soporte_interruptor_programar': {
        'contenido': '⏱️ Ayuda / Programar activación. Puedes establecer un periodo para activar el interruptor.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # SOPORTE DVR
    # ---------------------------------------------------------

    'soporte_dvr': {
        'contenido': '📹 Ayuda / DVR y cámaras. ¿Qué necesitas hacer?',
        'opciones': [
            {
                'clave': 'Soporte_DVR_Grabaciones',
                'contenido': '🎥 Ayuda / Consultar grabaciones',
                'siguiente': 'soporte_dvr_grabaciones'
            },
            {
                'clave': 'Soporte_DVR_Camara',
                'contenido': '📷 Ayuda / Mover cámara',
                'siguiente': 'soporte_dvr_camara'
            },
            {
                'clave': 'Soporte_DVR_Estado',
                'contenido': '✅ Ayuda / Consultar estado',
                'siguiente': 'soporte_dvr_estado'
            }
        ]
    },


    'soporte_dvr_grabaciones': {
        'contenido': '🎥 Ayuda / Grabaciones. Puedes consultar las grabaciones disponibles de las cámaras.',
        'opciones': []
    },


    'soporte_dvr_camara': {
        'contenido': '📷 Ayuda / Cámara. Puedes controlar el movimiento de las cámaras compatibles.',
        'opciones': []
    },


    'soporte_dvr_estado': {
        'contenido': '✅ Ayuda / Estado del DVR. Podemos consultar si el dispositivo está disponible.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # SOPORTE ALARMA
    # ---------------------------------------------------------

    'soporte_alarma': {
        'contenido': '🚨 Ayuda / Alarma vehicular. Selecciona el servicio que necesitas revisar.',
        'opciones': [
            {
                'clave': 'Soporte_Alarma_GPS',
                'contenido': '📍 Ayuda / Localización GPS',
                'siguiente': 'soporte_alarma_gps'
            },
            {
                'clave': 'Soporte_Alarma_Corriente',
                'contenido': '⚡ Ayuda / Corta corriente',
                'siguiente': 'soporte_alarma_corriente'
            },
            {
                'clave': 'Soporte_Alarma_Sirena',
                'contenido': '🚨 Ayuda / Alarma',
                'siguiente': 'soporte_alarma_sirena'
            },
            {
                'clave': 'Soporte_Alarma_Completa',
                'contenido': '🛡️ Ayuda / GPS + Alarma + Corta corriente',
                'siguiente': 'soporte_alarma_completa'
            }
        ]
    },


    'soporte_alarma_gps': {
        'contenido': '📍 Ayuda / Localización GPS. Vamos a revisar la ubicación del vehículo y el estado del dispositivo.',
        'opciones': []
    },


    'soporte_alarma_corriente': {
        'contenido': '⚡ Ayuda / Corta corriente. Vamos a revisar el dispositivo encargado del corte de corriente.',
        'opciones': []
    },


    'soporte_alarma_sirena': {
        'contenido': '🚨 Ayuda / Alarma. Vamos a revisar el sistema de alarma del vehículo.',
        'opciones': []
    },


    'soporte_alarma_completa': {
        'contenido': '🛡️ Ayuda / GPS + Alarma + Corta corriente. Vamos a revisar los tres servicios del vehículo.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # CONEXIÓN
    # ---------------------------------------------------------

    'soporte_conexion': {
        'contenido': '📡 Ayuda / Conexión. ¿Qué deseas revisar?',
        'opciones': [
            {
                'clave': 'Soporte_Conexion_Dispositivo',
                'contenido': '📟 Ayuda / Conexión del dispositivo',
                'siguiente': 'soporte_conexion_dispositivo'
            },
            {
                'clave': 'Soporte_Conexion_SGALA',
                'contenido': '💻 Ayuda / Conexión con SGALA',
                'siguiente': 'soporte_conexion_sgala'
            }
        ]
    },


    'soporte_conexion_dispositivo': {
        'contenido': '📡 Ayuda / Conexión del dispositivo. Podemos validar el estado del dispositivo mediante su UUID.',
        'opciones': []
    },


    'soporte_conexion_sgala': {
        'contenido': '📡 Ayuda / Conexión SGALA. Vamos a revisar la comunicación con el sistema.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # USUARIO
    # ---------------------------------------------------------

    'soporte_usuario': {
        'contenido': '👤 Ayuda / Usuario. ¿Qué necesitas hacer?',
        'opciones': [
            {
                'clave': 'Soporte_Usuario_Acceso',
                'contenido': '🔐 Ayuda / Problema de acceso',
                'siguiente': 'soporte_sgala_ingreso'
            },
            {
                'clave': 'Soporte_Usuario_Cuenta',
                'contenido': '👤 Ayuda / Mi cuenta',
                'siguiente': 'soporte_usuario_cuenta'
            }
        ]
    },


    'soporte_usuario_cuenta': {
        'contenido': '👤 Ayuda / Cuenta. Aquí podemos consultar información relacionada con tu cuenta.',
        'opciones': []
    },


    # =========================================================
    # COMPRAS
    # =========================================================

    'compras': {
        'contenido': '🛒 Compras / Mis pedidos. Aquí puedes consultar las compras que has realizado.',
        'opciones': [
            {
                'clave': 'Compras_Pedidos',
                'contenido': '📦 Compras / Mis pedidos',
                'siguiente': 'compras_pedidos'
            },
            {
                'clave': 'Compras_Seguimiento',
                'contenido': '🚚 Compras / Seguimiento de pedido',
                'siguiente': 'compras_seguimiento'
            },
            {
                'clave': 'Compras_Dispositivo',
                'contenido': '📟 Compras / Consultar dispositivo',
                'siguiente': 'compras_dispositivo'
            }
        ]
    },


    'compras_pedidos': {
        'contenido': '📦 Compras / Mis pedidos. Aquí podremos consultar las compras realizadas por tu cuenta.',
        'opciones': [
            {
                'clave': 'Compras_Pedido_Reciente',
                'contenido': '🕘 Compras / Pedido más reciente',
                'siguiente': 'compras_pedido_reciente'
            },
            {
                'clave': 'Compras_Pedido_Buscar',
                'contenido': '🔎 Compras / Buscar pedido',
                'siguiente': 'compras_pedido_buscar'
            }
        ]
    },


    'compras_pedido_reciente': {
        'contenido': '🕘 Compras / Pedido más reciente. Vamos a consultar tu última compra.',
        'opciones': []
    },


    'compras_pedido_buscar': {
        'contenido': '🔎 Compras / Buscar pedido. Podemos localizar una compra mediante su información de pedido.',
        'opciones': []
    },


    'compras_seguimiento': {
        'contenido': '🚚 Compras / Seguimiento. ¿Qué deseas consultar?',
        'opciones': [
            {
                'clave': 'Compras_Seguimiento_Pedido',
                'contenido': '📦 Compras / Estado del pedido',
                'siguiente': 'compras_seguimiento_pedido'
            },
            {
                'clave': 'Compras_Seguimiento_Envio',
                'contenido': '🚚 Compras / Estado del envío',
                'siguiente': 'compras_seguimiento_envio'
            }
        ]
    },


    'compras_seguimiento_pedido': {
        'contenido': '📦 Compras / Estado del pedido. Consultaremos en qué etapa se encuentra tu compra.',
        'opciones': []
    },


    'compras_seguimiento_envio': {
        'contenido': '🚚 Compras / Estado del envío. Consultaremos el estado del envío.',
        'opciones': []
    },


    'compras_dispositivo': {
        'contenido': '📟 Compras / Dispositivo. Los dispositivos pueden identificarse mediante una clave UUID.',
        'opciones': [
            {
                'clave': 'Compras_Dispositivo_Estado',
                'contenido': '✅ Compras / Estado del dispositivo',
                'siguiente': 'compras_dispositivo_estado'
            },
            {
                'clave': 'Compras_Dispositivo_UUID',
                'contenido': '🔑 Compras / Consultar por UUID',
                'siguiente': 'compras_dispositivo_uuid'
            }
        ]
    },


    'compras_dispositivo_estado': {
        'contenido': '✅ Compras / Estado del dispositivo. Podemos consultar si el dispositivo se encuentra activo o inactivo.',
        'opciones': []
    },


    'compras_dispositivo_uuid': {
        'contenido': '🔑 Compras / UUID. Ingresa o proporciona el UUID del dispositivo que deseas consultar.',
        'opciones': []
    },


    # =========================================================
    # VENTAS
    # =========================================================

    'ventas': {
        'contenido': '🛍️ Ventas / Comprar. ¿Qué producto deseas conocer?',
        'opciones': [
            {
                'clave': 'Venta_Interruptores',
                'contenido': '🔌 Comprar / Interruptores',
                'siguiente': 'venta_interruptores'
            },
            {
                'clave': 'Venta_DVR',
                'contenido': '📹 Comprar / DVR para cámaras',
                'siguiente': 'venta_dvr'
            },
            {
                'clave': 'Venta_Alarmas',
                'contenido': '🚨 Comprar / Alarmas vehiculares',
                'siguiente': 'venta_alarmas'
            }
        ]
    },


    # ---------------------------------------------------------
    # VENTA INTERRUPTORES
    # ---------------------------------------------------------

    'venta_interruptores': {
        'contenido': '🔌 Comprar / Interruptores. Dispositivos que pueden activarse desde la aplicación.',
        'opciones': [
            {
                'clave': 'Venta_Interruptor_Activacion',
                'contenido': '⚡ Comprar / Activación desde aplicación',
                'siguiente': 'venta_interruptor_activacion'
            },
            {
                'clave': 'Venta_Interruptor_Programada',
                'contenido': '⏱️ Comprar / Activación programada',
                'siguiente': 'venta_interruptor_programada'
            },
            {
                'clave': 'Venta_Interruptor_Estado',
                'contenido': '✅ Comprar / Estado y UUID',
                'siguiente': 'venta_interruptor_estado'
            }
        ]
    },


    'venta_interruptor_activacion': {
        'contenido': '⚡ Comprar / Interruptor. Puede activarse desde la aplicación cuando lo necesites.',
        'opciones': []
    },


    'venta_interruptor_programada': {
        'contenido': '⏱️ Comprar / Interruptor. Puedes configurar un periodo para la activación.',
        'opciones': []
    },


    'venta_interruptor_estado': {
        'contenido': '✅ Comprar / Interruptor. Cada dispositivo utiliza un UUID para identificarse ante el sistema y cuenta con un estado activo o inactivo.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # VENTA DVR
    # ---------------------------------------------------------

    'venta_dvr': {
        'contenido': '📹 Comprar / DVR para cámaras. ¿Qué función deseas conocer?',
        'opciones': [
            {
                'clave': 'Venta_DVR_Grabaciones',
                'contenido': '🎥 Comprar / Consultar grabaciones',
                'siguiente': 'venta_dvr_grabaciones'
            },
            {
                'clave': 'Venta_DVR_Camaras',
                'contenido': '📷 Comprar / Controlar cámaras',
                'siguiente': 'venta_dvr_camaras'
            },
            {
                'clave': 'Venta_DVR_Estado',
                'contenido': '✅ Comprar / Estado y conexión',
                'siguiente': 'venta_dvr_estado'
            }
        ]
    },


    'venta_dvr_grabaciones': {
        'contenido': '🎥 Comprar / DVR. Permite consultar las grabaciones disponibles de las cámaras.',
        'opciones': []
    },


    'venta_dvr_camaras': {
        'contenido': '📷 Comprar / DVR. Las cámaras compatibles pueden controlarse y moverse desde la aplicación.',
        'opciones': []
    },


    'venta_dvr_estado': {
        'contenido': '✅ Comprar / DVR. El dispositivo puede identificarse mediante su UUID y consultar su estado de conexión.',
        'opciones': []
    },


    # ---------------------------------------------------------
    # VENTA ALARMAS
    # ---------------------------------------------------------

    'venta_alarmas': {
        'contenido': '🚨 Comprar / Alarmas vehiculares. Puedes adquirir uno o varios módulos según lo que necesites.',
        'opciones': [
            {
                'clave': 'Venta_Alarma_Solo',
                'contenido': '🚨 Comprar / Solo alarma',
                'siguiente': 'venta_alarma_solo'
            },
            {
                'clave': 'Venta_GPS',
                'contenido': '📍 Comprar / Solo localización GPS',
                'siguiente': 'venta_gps_solo'
            },
            {
                'clave': 'Venta_CortaCorriente',
                'contenido': '⚡ Comprar / Solo corta corriente',
                'siguiente': 'venta_corta_corriente_solo'
            },
            {
                'clave': 'Venta_GPS_Alarma',
                'contenido': '📍🚨 Comprar / GPS + alarma',
                'siguiente': 'venta_gps_alarma'
            },
            {
                'clave': 'Venta_GPS_CortaCorriente',
                'contenido': '📍⚡ Comprar / GPS + corta corriente',
                'siguiente': 'venta_gps_corta_corriente'
            },
            {
                'clave': 'Venta_Alarma_CortaCorriente',
                'contenido': '🚨⚡ Comprar / Alarma + corta corriente',
                'siguiente': 'venta_alarma_corta_corriente'
            },
            {
                'clave': 'Venta_Alarma_Completa',
                'contenido': '🛡️ Comprar / GPS + alarma + corta corriente',
                'siguiente': 'venta_alarma_completa'
            }
        ]
    },


    'venta_alarma_solo': {
        'contenido': '🚨 Comprar / Alarma vehicular. Esta configuración incluye únicamente la función de alarma.',
        'opciones': []
    },


    'venta_gps_solo': {
        'contenido': '📍 Comprar / Localización GPS. Esta configuración permite consultar la ubicación del vehículo.',
        'opciones': []
    },


    'venta_corta_corriente_solo': {
        'contenido': '⚡ Comprar / Corta corriente. Esta configuración permite controlar el corte de corriente del vehículo.',
        'opciones': []
    },


    'venta_gps_alarma': {
        'contenido': '📍🚨 Comprar / GPS + alarma. Incluye localización y función de alarma.',
        'opciones': []
    },


    'venta_gps_corta_corriente': {
        'contenido': '📍⚡ Comprar / GPS + corta corriente. Incluye localización y control del corte de corriente.',
        'opciones': []
    },


    'venta_alarma_corta_corriente': {
        'contenido': '🚨⚡ Comprar / Alarma + corta corriente. Incluye alarma y control del corte de corriente.',
        'opciones': []
    },


    'venta_alarma_completa': {
        'contenido': '🛡️ Comprar / GPS + alarma + corta corriente. Incluye las tres funciones para el vehículo.',
        'opciones': []
    }

}


# =============================================================
# SESIONES
# =============================================================

SESIONES = {}


def fecha_actual():

    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def generar_respuesta(flujo):

    datos = FLUJOS.get(flujo)

    if not datos:
        return None

    return {
        'tipo': 'O',
        'fecha': fecha_actual(),
        'usuario': 'A',
        'contenido': datos['contenido'],
        'opciones': datos.get('opciones', []),
        'flujo': flujo
    }


def iniciar_sesion(sid):

    SESIONES[sid] = {
        'ruta': ['inicio']
    }

    return generar_respuesta('inicio')


def eliminar_sesion(sid):

    SESIONES.pop(sid, None)


def buscar_opcion(flujo, mensaje):

    datos = FLUJOS.get(flujo)

    if not datos:
        return None

    for opcion in datos.get('opciones', []):

        if opcion['clave'].strip().lower() == mensaje.strip().lower():
            return opcion

    return None


def procesar_mensaje(sid, mensaje):

    mensaje = (mensaje or '').strip()

    print(f'📨 Mensaje: {mensaje}')

    if sid not in SESIONES:
        iniciar_sesion(sid)

    sesion = SESIONES[sid]

    ruta = sesion['ruta']

    # Buscar desde el flujo actual hacia atrás
    for indice in range(len(ruta) - 1, -1, -1):

        flujo_actual = ruta[indice]

        opcion = buscar_opcion(
            flujo_actual,
            mensaje
        )

        if not opcion:
            continue

        siguiente = opcion.get('siguiente')

        if not siguiente:

            return {
                'tipo': 'O',
                'fecha': fecha_actual(),
                'usuario': 'A',
                'contenido': 'Esta opción todavía no tiene un flujo configurado.',
                'flujo': flujo_actual
            }

        if siguiente not in FLUJOS:

            return {
                'tipo': 'O',
                'fecha': fecha_actual(),
                'usuario': 'A',
                'contenido': 'No se encontró el siguiente flujo.',
                'flujo': flujo_actual
            }

        # Mantener la ruta solamente hasta el punto
        # donde se encontró la opción.
        SESIONES[sid]['ruta'] = (
            ruta[:indice + 1] +
            [siguiente]
        )

        return generar_respuesta(siguiente)

    # No se encontró la opción
    flujo_actual = ruta[-1]

    return {
        'tipo': 'N',
        'fecha': fecha_actual(),
        'usuario': 'A',
        'contenido': 'No reconocí esa opción. Selecciona una de las opciones disponibles.',
        'opciones': FLUJOS[flujo_actual].get('opciones', []),
        'flujo': flujo_actual
    }