import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { EmailService } from './email.service';

/** Construye el servicio con las variables dadas (las de entorno siempre llegan como texto). */
const crear = async (env: Record<string, string> = {}): Promise<EmailService> => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EmailService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string, porDefecto?: unknown) =>
            key in env ? env[key] : porDefecto ?? null,
          ),
        },
      },
    ],
  }).compile();

  return module.get<EmailService>(EmailService);
};

/** Opciones con las que quedó armado nodemailer, o null si el servicio está en modo simulado. */
const opciones = (service: EmailService): Record<string, any> | null => {
  const transporter = (service as any).transporter;
  return transporter ? transporter.transporter.options : null;
};

const RESEND = {
  SMTP_HOST: 'smtp.resend.com',
  SMTP_USER: 'resend',
  SMTP_PASS: 're_clave_de_prueba',
  SMTP_FROM: 'EmergIA <no-reply@emerg-ia.com>',
};

describe('EmailService', () => {
  describe('modo simulado', () => {
    let service: EmailService;

    beforeEach(async () => {
      service = await crear({ SMTP_HOST: '', SMTP_FROM: 'SCI Sistema <no-reply@sci.local>' });
    });

    it('no arma el transporte si falta la configuración SMTP', () => {
      expect(opciones(service)).toBeNull();
    });

    it('sendActivationEmail no lanza error', async () => {
      await expect(
        service.sendActivationEmail('test@sci.local', 'Juan Perez', 'http://localhost:4200/auth/activate?token=xyz'),
      ).resolves.not.toThrow();
    });

    it('sendPasswordRecoveryEmail no lanza error', async () => {
      await expect(
        service.sendPasswordRecoveryEmail('test@sci.local', 'Juan Perez', 'http://localhost:4200/auth/recover-password?token=xyz'),
      ).resolves.not.toThrow();
    });
  });

  describe('SMTP_SECURE', () => {
    // Una variable de entorno nunca es booleana: `"false"` es una cadena con contenido y nodemailer
    // la tomaba por verdadera, abriendo TLS en un puerto que espera STARTTLS.
    it('el texto "false" apaga el TLS directo', async () => {
      const service = await crear({ ...RESEND, SMTP_PORT: '587', SMTP_SECURE: 'false' });
      expect(opciones(service).secure).toBe(false);
    });

    it('el texto "true" lo enciende', async () => {
      const service = await crear({ ...RESEND, SMTP_PORT: '465', SMTP_SECURE: 'true' });
      expect(opciones(service).secure).toBe(true);
    });

    it('acepta "0" y "1", y no distingue mayúsculas', async () => {
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '587', SMTP_SECURE: '0' })).secure).toBe(false);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '465', SMTP_SECURE: '1' })).secure).toBe(true);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '465', SMTP_SECURE: ' TRUE ' })).secure).toBe(true);
    });

    it('sin valor, lo deduce del puerto: 465 y 2465 son TLS directo', async () => {
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '465' })).secure).toBe(true);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '2465' })).secure).toBe(true);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '587' })).secure).toBe(false);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '2587' })).secure).toBe(false);
      expect(opciones(await crear({ ...RESEND, SMTP_PORT: '25' })).secure).toBe(false);
    });

    it('sin SMTP_PORT usa el 587 con STARTTLS', async () => {
      const service = await crear(RESEND);
      expect(opciones(service)).toMatchObject({ port: 587, secure: false });
    });
  });

  describe('credenciales', () => {
    it('recorta los espacios del host y del usuario pegados por descuido', async () => {
      const service = await crear({ ...RESEND, SMTP_HOST: '  smtp.resend.com  ', SMTP_USER: ' resend ' });
      expect(opciones(service)).toMatchObject({ host: 'smtp.resend.com' });
      expect(opciones(service).auth).toMatchObject({ user: 'resend' });
    });

    it('sin clave queda en modo simulado, no a medio configurar', async () => {
      const service = await crear({ ...RESEND, SMTP_PASS: '' });
      expect(opciones(service)).toBeNull();
    });
  });
});
