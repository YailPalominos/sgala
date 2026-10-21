# Notificaciones MQTT para teléfonos SGALA

Los teléfonos SGALA son dispositivos de tipo `Y`. Cuando están conectados al broker reciben alertas publicadas en un tópico privado por dispositivo:

```text
notificaciones/{clave-del-dispositivo-en-minusculas}
```

El teléfono debe suscribirse a ese tópico al conectar (QoS 1). El broker solo publica alertas a dispositivos `Y` del mismo usuario que figuren conectados en Redis. Las publicaciones usan QoS 1 y no se retienen, así que son notificaciones en tiempo real para teléfonos conectados.

El contenido es JSON UTF-8 con este formato:

```json
{
  "version": 1,
  "tipo": "alerta",
  "id": "identificador-unico",
  "categoria": "sin-conexion",
  "titulo": "Dispositivo sin conexión",
  "mensaje": "Dispositivo 'Vehículo' sin conexión.",
  "fecha": "2026-10-20T12:00:00.000Z",
  "datos": {
    "claveDispositivo": "clave-del-dispositivo",
    "alias": "Vehículo"
  }
}
```

El receptor debe mostrar `titulo` y `mensaje`; puede usar `categoria` y `datos` para abrir la pantalla correspondiente. Actualmente el backend entrega por este canal las alertas de desconexión, tanto las detectadas al desconectarse como las detectadas durante la revisión de dispositivos sin conexión.
