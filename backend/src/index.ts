import 'dotenv/config';
import express from 'express';
import { manejadorErrores } from './interceptores/error.middleware';
import { middlewareSesion } from './interceptores/sesion.middleware';
import { autenticacionRouter } from './rutas/usuario.ruta';
import { administradorRouter } from './rutas/administrador.ruta';
import { dispositivoRouter } from './rutas/dispositivo.ruta';
import { solicitudRouter } from './rutas/solicitud.ruta';
import { suscripcionesRoute } from './rutas/suscripciones.ruta';
import { eventoRouter } from './rutas/eventos.ruta';
import { iniciarPrisma } from './recursos/prisma';
import { redis } from './recursos/redis';
import { iniciarBrokerMqtt } from './broker';
import { iniciarServidorSocketio } from './socket';
import { iniciarWebPush } from './webpush';
import cors from 'cors';
import { redisRepositorio } from './repositorios/redis.repositorio';
import { datosRoute } from './rutas/datos.ruta';
import { entorno } from './recursos/entorno';

const puerto = entorno.PUERTO_API

const app = express();

const permitidos = ['https://192.168.1.5:4200', 'https://localhost:4200'];

app.use(cors({
  origin(origin, callback) {
    if (!origin || permitidos.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use(
  middlewareSesion.unless({
    path: [
      {
        url: '/api/usuarios/iniciar-sesion',
        method: 'POST'
      },
      {
        url: '/api/administradores/autenticar',
        method: 'POST'
      },
      {
        url: /^\/api\/usuarios\/validar-clave\/[^/]+$/,
        method: 'GET'
      },
      {
        url: /^\/api\/usuarios\/verificar-identidad\/[^/]+$/,
        method: 'GET'
      },
      {
        url: '/api/usuarios/solicitar-recuperacion',
        method: 'POST'
      },
      {
        url: '/api/usuarios/cambiar',
        method: 'POST'
      },
      {
        url: '/api/usuarios/crear',
        method: 'POST'
      },
      {
        url: '/api/solicitudes/crear',
        method: 'POST'
      }
    ]
  })
);

app.use((solicitud, respuesta, siguiente) => {
  const esRutaAdministrador = solicitud.path.startsWith('/api/administradores/');
  const esCierreSesion = solicitud.path === '/api/usuarios/cerrar-sesion';
  if (
    solicitud.sesion?.tipoCuenta === 'administrador' &&
    !esRutaAdministrador &&
    !esCierreSesion
  ) {
    respuesta.status(403).json({
      mensaje: 'La sesión de administrador no puede acceder a rutas de usuario.'
    });
    return;
  }
  siguiente();
});

app.use('/api/usuarios', autenticacionRouter);
app.use('/api/administradores', administradorRouter);
app.use('/api/dispositivos', dispositivoRouter);
app.use('/api/solicitudes', solicitudRouter);
app.use('/api/datos', datosRoute);
app.use('/api/suscripciones', suscripcionesRoute);
app.use('/api/eventos', eventoRouter);


// 3. Manejador de errores (debe ser el último middleware)
app.use(manejadorErrores);

/**
 * Función de arranque asíncrona.
 * Inicializa conexiones a SQL Server y Redis, inicia el servidor HTTP,
 * el broker MQTT con sus manejadores de eventos y el servidor Socket.io.
 */
async function iniciar(): Promise<void> {
  // a. Conectar a SQL Server (Prisma)
  await iniciarPrisma();

  // b. Conectar a Redis
  await redis.connect();
  console.log('📦 Redis conectado');

  // c. Iniciar servidor HTTP Express
  app.listen(puerto, () => {
    console.log(`🌐 API escuchando en puerto ${puerto}`);
  });

  // d. Iniciar broker MQTT y registrar manejadores de eventos
  await iniciarBrokerMqtt()

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

  await iniciarServidorSocketio();

  await iniciarWebPush();

  console.log('✅ SGALA iniciado.');
}

// Arrancar la aplicación
iniciar().catch((error) => {
  console.error('❌ Error fatal al iniciar SGALA:', error);
  process.exit(1);
});

export default app;
