/**
 * Property-Based Test: Validación de mensajes MQTT
 *
 * **Validates: Requirements 9.7**
 *
 * Para cualquier mensaje MQTT que no contenga latitud, longitud o altitud válidas
 * (campos ausentes, tipos incorrectos, valores fuera de rango), el sistema debe
 * descartar el mensaje sin actualizar Redis ni la base de datos.
 */
import fc from 'fast-check';
import { onPublicacion } from './manejadores.mqtt';

// Mocks
jest.mock('../repositorios/dispositivo.repositorio');
jest.mock('../repositorios/redis.repositorio', () => ({
  redisRepositorio: {
    obtenerEstadoDispositivo: jest.fn(),
    guardarEstadoDispositivo: jest.fn(),
  },
}));
jest.mock('../servicios/localizacion.servicio');
jest.mock('../socketio/emisor.socketio');

import * as localizacionServicio from '../servicios/localizacion.servicio';
import { redisRepositorio } from '../repositorios/redis.repositorio';
import * as emisorSocketio from '../socketio/emisor.socketio';

const mockProcesarLocalizacion = localizacionServicio.procesarLocalizacion as jest.MockedFunction<typeof localizacionServicio.procesarLocalizacion>;
const mockGuardarEstado = redisRepositorio.guardarEstadoDispositivo as jest.MockedFunction<typeof redisRepositorio.guardarEstadoDispositivo>;
const mockEmitirAUsuario = emisorSocketio.emitirAUsuario as jest.MockedFunction<typeof emisorSocketio.emitirAUsuario>;

/**
 * Arbitrary: genera un UUID válido para el topic
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary: genera un topic MQTT válido con formato "dispositivos/{uuid}/localizacion"
 */
const topicValidoArb = uuidArb.map(uuid => `dispositivos/${uuid}/localizacion`);

/**
 * Arbitrary: genera un valor que NO es un número finito válido.
 * Incluye: strings, booleans, objetos, arrays, null, undefined
 */
const noNumericoArb = fc.oneof(
  fc.string(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.array(fc.anything()),
  fc.dictionary(fc.string(), fc.anything()),
);

/**
 * Arbitrary: genera una latitud fuera de rango (< -90 o > 90)
 */
const latitudFueraDeRangoArb = fc.oneof(
  fc.double({ min: 90.0001, max: 1000, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: -1000, max: -90.0001, noNaN: true, noDefaultInfinity: true }),
);

/**
 * Arbitrary: genera una longitud fuera de rango (< -180 o > 180)
 */
const longitudFueraDeRangoArb = fc.oneof(
  fc.double({ min: 180.0001, max: 1000, noNaN: true, noDefaultInfinity: true }),
  fc.double({ min: -1000, max: -180.0001, noNaN: true, noDefaultInfinity: true }),
);

/**
 * Arbitrary: genera una latitud válida dentro de rango
 */
const latitudValidaArb = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera una longitud válida dentro de rango
 */
const longitudValidaArb = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });

/**
 * Arbitrary: genera una altitud válida
 */
const altitudValidaArb = fc.double({ min: -500, max: 20000, noNaN: true, noDefaultInfinity: true });

/**
 * Helper: crea un Buffer a partir de un objeto (serializado como JSON)
 */
function crearMensajeBuffer(datos: unknown): Buffer {
  return Buffer.from(JSON.stringify(datos));
}

describe('Property Test — Validación de mensajes MQTT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 14 (Escenario 1): Mensajes con campos ausentes (sin lat, lng o alt) se descartan sin modificar Redis ni BD', async () => {
    /**
     * Genera mensajes donde al menos uno de los campos requeridos (latitud, longitud, altitud) está ausente.
     */
    const mensajeSinCampoArb = fc.oneof(
      // Sin latitud
      fc.record({
        longitud: longitudValidaArb,
        altitud: altitudValidaArb,
      }),
      // Sin longitud
      fc.record({
        latitud: latitudValidaArb,
        altitud: altitudValidaArb,
      }),
      // Sin altitud
      fc.record({
        latitud: latitudValidaArb,
        longitud: longitudValidaArb,
      }),
      // Sin latitud ni longitud
      fc.record({
        altitud: altitudValidaArb,
      }),
      // Sin latitud ni altitud
      fc.record({
        longitud: longitudValidaArb,
      }),
      // Sin longitud ni altitud
      fc.record({
        latitud: latitudValidaArb,
      }),
      // Objeto vacío
      fc.constant({}),
    );

    await fc.assert(
      fc.asyncProperty(
        topicValidoArb,
        mensajeSinCampoArb,
        async (topic, mensaje) => {
          jest.clearAllMocks();

          await onPublicacion(topic, crearMensajeBuffer(mensaje));

          // PROPIEDAD: No se llama a procesarLocalizacion (no se modifica Redis ni BD)
          expect(mockProcesarLocalizacion).not.toHaveBeenCalled();
          // PROPIEDAD: No se actualiza Redis directamente
          expect(mockGuardarEstado).not.toHaveBeenCalled();
          // PROPIEDAD: No se emiten eventos Socket.io
          expect(mockEmitirAUsuario).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14 (Escenario 2): Mensajes con tipos no numéricos se descartan sin modificar Redis ni BD', async () => {
    /**
     * Genera mensajes donde al menos uno de los campos tiene un tipo incorrecto (no numérico).
     */
    const mensajeTipoIncorrectoArb = fc.oneof(
      // Latitud no numérica
      fc.record({
        latitud: noNumericoArb,
        longitud: longitudValidaArb,
        altitud: altitudValidaArb,
      }),
      // Longitud no numérica
      fc.record({
        latitud: latitudValidaArb,
        longitud: noNumericoArb,
        altitud: altitudValidaArb,
      }),
      // Altitud no numérica
      fc.record({
        latitud: latitudValidaArb,
        longitud: longitudValidaArb,
        altitud: noNumericoArb,
      }),
      // Todos no numéricos
      fc.record({
        latitud: noNumericoArb,
        longitud: noNumericoArb,
        altitud: noNumericoArb,
      }),
    );

    await fc.assert(
      fc.asyncProperty(
        topicValidoArb,
        mensajeTipoIncorrectoArb,
        async (topic, mensaje) => {
          jest.clearAllMocks();

          await onPublicacion(topic, crearMensajeBuffer(mensaje));

          // PROPIEDAD: No se llama a procesarLocalizacion (no se modifica Redis ni BD)
          expect(mockProcesarLocalizacion).not.toHaveBeenCalled();
          // PROPIEDAD: No se actualiza Redis directamente
          expect(mockGuardarEstado).not.toHaveBeenCalled();
          // PROPIEDAD: No se emiten eventos Socket.io
          expect(mockEmitirAUsuario).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14 (Escenario 3): Mensajes con valores fuera de rango geográfico se descartan sin modificar Redis ni BD', async () => {
    /**
     * Genera mensajes donde latitud o longitud están fuera de rango válido.
     */
    const mensajeFueraDeRangoArb = fc.oneof(
      // Latitud fuera de rango
      fc.record({
        latitud: latitudFueraDeRangoArb,
        longitud: longitudValidaArb,
        altitud: altitudValidaArb,
      }),
      // Longitud fuera de rango
      fc.record({
        latitud: latitudValidaArb,
        longitud: longitudFueraDeRangoArb,
        altitud: altitudValidaArb,
      }),
      // Ambos fuera de rango
      fc.record({
        latitud: latitudFueraDeRangoArb,
        longitud: longitudFueraDeRangoArb,
        altitud: altitudValidaArb,
      }),
    );

    await fc.assert(
      fc.asyncProperty(
        topicValidoArb,
        mensajeFueraDeRangoArb,
        async (topic, mensaje) => {
          jest.clearAllMocks();

          await onPublicacion(topic, crearMensajeBuffer(mensaje));

          // PROPIEDAD: No se llama a procesarLocalizacion (no se modifica Redis ni BD)
          expect(mockProcesarLocalizacion).not.toHaveBeenCalled();
          // PROPIEDAD: No se actualiza Redis directamente
          expect(mockGuardarEstado).not.toHaveBeenCalled();
          // PROPIEDAD: No se emiten eventos Socket.io
          expect(mockEmitirAUsuario).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
