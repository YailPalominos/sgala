import express from 'express';
import { configurarSeguridad } from './middlewares/seguridad.middleware';
import { manejadorErrores } from './middlewares/error.middleware';
import { autenticacionRouter } from './recursos/autenticacion.recurso';
import { dispositivoRouter } from './recursos/dispositivo.recurso';
import { conexionPool } from './configuracion/base-datos';
import { redis } from './configuracion/redis';
import { iniciarBrokerMqtt, aedesInstance } from './mqtt/broker.mqtt';
import { onConexion, onDesconexion, onPublicacion } from './mqtt/manejadores.mqtt';
import { iniciarServidorSocketio } from './socketio/servidor.socketio';

const app = express();
const PUERTO = parseInt(process.env.SGALA_PUERTO_HTTP || '3000', 10);

// 1. Middlewares de seguridad (cors → cookie-parser → json)
configurarSeguridad(app);

// 2. Rutas
app.use('/api/auth', autenticacionRouter);
app.use('/api/dispositivos', dispositivoRouter);

// 3. Manejador de errores (debe ser el último middleware)
app.use(manejadorErrores);

/**
 * Función de arranque asíncrona.
 * Inicializa conexiones a SQL Server y Redis, inicia el servidor HTTP,
 * el broker MQTT con sus manejadores de eventos y el servidor Socket.io.
 */
async function iniciar(): Promise<void> {
  // a. Conectar a SQL Server
  await conexionPool;
  console.log('Conexión a SQL Server establecida');

  // b. Conectar a Redis
  await redis.connect();
  console.log('Conexión a Redis establecida');

  // c. Iniciar servidor HTTP Express
  app.listen(PUERTO, () => {
    console.log(`SGALA Backend escuchando en puerto ${PUERTO}`);
  });

  // d. Iniciar broker MQTT y registrar manejadores de eventos
  iniciarBrokerMqtt();

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

  console.log('SGALA: Todos los servicios iniciados correctamente');
}

// Arrancar la aplicación
iniciar().catch((error) => {
  console.error('Error fatal al iniciar SGALA:', error);
  process.exit(1);
});

export default app;
