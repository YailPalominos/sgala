const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
});

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: (...args: unknown[]) => mockCreateTransport(...args),
  },
}));

jest.mock('../configuracion/entorno', () => ({
  entorno: {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PUERTO: 587,
    SMTP_USUARIO: 'usuario@test.com',
    SMTP_CONTRASENA: 'contrasena123',
  },
}));

import { enviarCorreoRecuperacion } from './correo.servicio';

describe('correo.servicio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  describe('enviarCorreoRecuperacion', () => {
    it('debe crear el transporter con la configuración SMTP correcta', async () => {
      await enviarCorreoRecuperacion('destino@test.com', 'llave-uuid-123');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'usuario@test.com',
          pass: 'contrasena123',
        },
      });
    });

    it('debe llamar sendMail con el destinatario y enlace correctos', async () => {
      const correo = 'usuario@ejemplo.com';
      const llave = 'abc-123-def';

      await enviarCorreoRecuperacion(correo, llave);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const llamada = mockSendMail.mock.calls[0][0];

      expect(llamada.from).toBe('usuario@test.com');
      expect(llamada.to).toBe(correo);
      expect(llamada.subject).toBe('SGALA - Recuperación de contraseña');
      expect(llamada.html).toContain(
        'http://localhost:4200/recuperacion/cambiar?llave=abc-123-def'
      );
    });

    it('debe usar secure: true cuando el puerto SMTP es 465', async () => {
      jest.resetModules();

      jest.doMock('../configuracion/entorno', () => ({
        entorno: {
          SMTP_HOST: 'smtp.secure.com',
          SMTP_PUERTO: 465,
          SMTP_USUARIO: 'secure@test.com',
          SMTP_CONTRASENA: 'pass-segura',
        },
      }));

      const mockSendMail465 = jest.fn().mockResolvedValue({ messageId: 'id-465' });
      const mockCreateTransport465 = jest.fn().mockReturnValue({
        sendMail: mockSendMail465,
      });

      jest.doMock('nodemailer', () => ({
        __esModule: true,
        default: {
          createTransport: mockCreateTransport465,
        },
      }));

      const { enviarCorreoRecuperacion: enviarConPuerto465 } = await import('./correo.servicio');

      await enviarConPuerto465('test@test.com', 'llave-465');

      expect(mockCreateTransport465).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    it('debe propagar errores cuando sendMail falla', async () => {
      const errorSMTP = new Error('Connection refused');
      mockSendMail.mockRejectedValue(errorSMTP);

      await expect(
        enviarCorreoRecuperacion('destino@test.com', 'llave-error')
      ).rejects.toThrow('Connection refused');
    });

    it('debe incluir el enlace de recuperación con la llave en el HTML', async () => {
      const llave = 'mi-llave-unica-uuid';

      await enviarCorreoRecuperacion('test@mail.com', llave);

      const llamada = mockSendMail.mock.calls[0][0];
      expect(llamada.html).toContain(`http://localhost:4200/recuperacion/cambiar?llave=${llave}`);
    });
  });
});
