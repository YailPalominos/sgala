import tls from 'tls';
import fs from 'fs';

jest.mock('fs');
jest.mock('tls');
jest.mock('../configuracion/entorno', () => ({
  entorno: {
    PUERTO_MQTT: 4060,
    RUTA_CERTIFICADOS: '/ruta/certificados',
  },
}));

const fsMock = fs as jest.Mocked<typeof fs>;
const tlsMock = tls as jest.Mocked<typeof tls>;

describe('broker.mqtt', () => {
  const servidorMock = {
    listen: jest.fn((_puerto: number, cb?: () => void) => {
      if (cb) cb();
      return servidorMock;
    }),
  } as unknown as tls.Server;

  beforeEach(() => {
    jest.clearAllMocks();
    fsMock.readFileSync.mockReturnValue(Buffer.from('contenido-cert'));
    tlsMock.createServer.mockReturnValue(servidorMock);
  });

  afterAll(() => {
    const { aedesInstance } = require('./broker.mqtt');
    aedesInstance.close();
  });

  it('debe exportar la instancia de aedes', () => {
    const { aedesInstance } = require('./broker.mqtt');
    expect(aedesInstance).toBeDefined();
    expect(typeof aedesInstance.handle).toBe('function');
  });

  it('debe cargar certificados desde la ruta de entorno', () => {
    const { iniciarBrokerMqtt } = require('./broker.mqtt');
    iniciarBrokerMqtt();

    expect(fsMock.readFileSync).toHaveBeenCalledWith('/ruta/certificados/server.key');
    expect(fsMock.readFileSync).toHaveBeenCalledWith('/ruta/certificados/server.crt');
    expect(fsMock.readFileSync).toHaveBeenCalledWith('/ruta/certificados/ca.crt');
  });

  it('debe crear servidor TLS con requestCert y rejectUnauthorized', () => {
    const { iniciarBrokerMqtt } = require('./broker.mqtt');
    iniciarBrokerMqtt();

    expect(tlsMock.createServer).toHaveBeenCalledWith(
      expect.objectContaining({
        key: Buffer.from('contenido-cert'),
        cert: Buffer.from('contenido-cert'),
        ca: Buffer.from('contenido-cert'),
        requestCert: true,
        rejectUnauthorized: true,
      }),
      expect.any(Function),
    );
  });

  it('debe escuchar en el puerto MQTT configurado (4060)', () => {
    const { iniciarBrokerMqtt } = require('./broker.mqtt');
    iniciarBrokerMqtt();

    expect(servidorMock.listen).toHaveBeenCalledWith(4060, expect.any(Function));
  });

  it('debe retornar el servidor TLS creado', () => {
    const { iniciarBrokerMqtt } = require('./broker.mqtt');
    const resultado = iniciarBrokerMqtt();

    expect(resultado).toBe(servidorMock);
  });
});
