import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SMTP_HOST') return '';
              if (key === 'SMTP_FROM') return 'SCI Sistema <no-reply@sci.local>';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should run in simulated mode without throwing errors when SMTP is not configured', async () => {
    await expect(
      service.sendActivationEmail('test@sci.local', 'Juan Perez', 'http://localhost:4200/auth/activate?token=xyz'),
    ).resolves.not.toThrow();
  });

  it('should run sendPasswordRecoveryEmail in simulated mode without throwing errors', async () => {
    await expect(
      service.sendPasswordRecoveryEmail('test@sci.local', 'Juan Perez', 'http://localhost:4200/auth/recover-password?token=xyz'),
    ).resolves.not.toThrow();
  });
});
