import 'dotenv/config';
import express from 'express';
import { manejadorErrores } from './interceptores/error.middleware';
import { middlewareSesion } from './interceptores/sesion.middleware';
import { autenticacionRouter } from './rutas/usuario.ruta';
import { dispositivoRouter } from './rutas/dispositivo.ruta';
import { solicitudRouter } from './rutas/solicitud.ruta';
import { iniciar as iniciarBaseDatos } from './recursos/base-datos';
import { redis } from './recursos/redis';
import { iniciarBrokerMqtt, aedesInstance } from './mqtt/broker.mqtt';
import { onConexion, onDesconexion, onPublicacion, iniciarConexiones } from './mqtt/manejadores.mqtt';
import { iniciarServidorSocketio } from './socketio/servidor.socketio';
import cors from 'cors';
import { redisRepositorio } from './repositorios/redis.repositorio';
import { datosRoute } from './rutas/datos.ruta';

const PUERTO = Number(process.env.SGALA_PUERTO_HTTP);

if (!Number.isInteger(PUERTO)) {
  throw new Error('La variable de entorno SGALA_PUERTO_HTTP es obligatoria y debe ser un número válido.');
}

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ['http://localhost:4200', 'http://10.1.33.50:4200'],
    credentials: true,
  })
);

app.use(
  middlewareSesion.unless({
    path: [
      {
        url: '/api/usuario/iniciar-sesion',
        method: 'POST'
      },
      {
        url: '/api/usuario/validar-clave/:clave',
        method: 'GET'
      },
      {
        url: '/api/usuario/verificar-identidad/:identificador',
        method: 'POST'
      },
      {
        url: '/api/usuario/solicitar-recuperacion',
        method: 'POST'
      },
      {
        url: '/api/usuario/recuperacion/cambiar',
        method: 'POST'
      }
    ]
  })
);

app.use('/api/usuario', autenticacionRouter);
app.use('/api/dispositivos', dispositivoRouter);
app.use('/api/solicitudes', solicitudRouter);
app.use('/api/datos', datosRoute);

// 3. Manejador de errores (debe ser el último middleware)
app.use(manejadorErrores);

/**
 * Función de arranque asíncrona.
 * Inicializa conexiones a SQL Server y Redis, inicia el servidor HTTP,
 * el broker MQTT con sus manejadores de eventos y el servidor Socket.io.
 */
async function iniciar(): Promise<void> {
  // a. Conectar a SQL Server
  await iniciarBaseDatos();

  // b. Conectar a Redis
  await redis.connect();
  console.log('🟢 Redis conectado');

  // c. Iniciar servidor HTTP Express
  app.listen(PUERTO, () => {
    console.log(`🌐 HTTP escuchando en puerto ${PUERTO}`);
  });

  // d. Iniciar broker MQTT y registrar manejadores de eventos
  iniciarBrokerMqtt();
  iniciarConexiones()


  const precios = [
    {
      tipo: 'S',
      nombre: 'Semestral',
      LOC: 50,
      ALA: 20,
      COC: 40
    },
    {
      tipo: 'A',
      nombre: 'Anual',
      LOC: 90,
      ALA: 20,
      COC: 40
    }
  ]

  redisRepositorio.actualizarPrecios(precios)

  aedesInstance.on('client', (client) => {
    onConexion(client.id);
  });

  aedesInstance.on('clientDisconnect', (client) => {
    onDesconexion(client.id);
  });

  aedesInstance.on('publish', (packet, client) => {
    if (client) {
      onPublicacion(packet.topic, packet.payload as Buffer);
    }
  });

  // e. Iniciar servidor Socket.io
  iniciarServidorSocketio();

  console.log('✅ SGALA: Todos los servicios iniciados');
}

// Arrancar la aplicación
iniciar().catch((error) => {
  console.error('❌ Error fatal al iniciar SGALA:', error);
  process.exit(1);
});

export default app;
