import socketio
from aiohttp import web

from flujos import (
    iniciar_sesion,
    eliminar_sesion,
    procesar_mensaje
)


PUERTO = 4700


sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*'
)


app = web.Application()

sio.attach(app)


@sio.event
async def connect(sid, environ):

    print(f'🔌 Cliente conectado: {sid}')

    respuesta = iniciar_sesion(sid)

    await sio.emit(
        'respuesta',
        respuesta,
        to=sid
    )


@sio.event
async def disconnect(sid):

    print(f'🔌 Cliente desconectado: {sid}')

    eliminar_sesion(sid)


@sio.event
async def mensaje(sid, data):

    print(f'📨 Mensaje recibido de {sid}: {data}')

    mensaje = data.get('mensaje')

    respuesta = procesar_mensaje(
        sid,
        mensaje
    )

    await sio.emit(
        'respuesta',
        respuesta,
        to=sid
    )


def iniciar_socket():

    print(f'📡 Socket escuchando en puerto {PUERTO}')

    web.run_app(
        app,
        host='0.0.0.0',
        port=PUERTO
    )