import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildEmailTemplate } from '../templates/email/base-email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);

    if (user && pass && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`[initTransporter] Configuración SMTP inicializada para ${host}:${port}`);
    } else {
      this.logger.warn(
        '[initTransporter] Variables SMTP no configuradas completamente. Servicio de Email en modo simulado (los enlaces se imprimirán en logs).',
      );
    }
  }

  async sendActivationEmail(
    to: string,
    userName: string,
    activationUrl: string,
  ): Promise<void> {
    const subject = 'Activación de Cuenta - Sistema de Comando de Incidentes (SCI)';
    const title = 'Activación de tu Cuenta de Usuario';
    const bodyHtml = `
      <p style="margin-bottom: 16px;">Se ha creado una cuenta para ti en el Sistema de Comando de Incidentes (SCI).</p>
      <p style="margin-bottom: 16px;">Para activar tu cuenta y establecer tu contraseña de acceso, por favor haz clic en el siguiente botón:</p>
    `;
    const footerNote = 'Este enlace de activación estará disponible por tiempo limitado. Si tú no solicitaste esta cuenta, por favor ignora este correo.';

    const html = buildEmailTemplate({
      title,
      userName,
      bodyHtml,
      actionUrl: activationUrl,
      actionLabel: 'Activar mi Cuenta',
      footerNote,
    });

    await this.sendMail(to, subject, html, activationUrl);
  }

  async sendPasswordRecoveryEmail(
    to: string,
    userName: string,
    recoveryUrl: string,
  ): Promise<void> {
    const subject = 'Restablecimiento de Contraseña - SCI';
    const title = 'Restablecer Contraseña';
    const bodyHtml = `
      <p style="margin-bottom: 16px;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema SCI.</p>
      <p style="margin-bottom: 16px;">Para crear una nueva contraseña, haz clic en el botón a continuación:</p>
    `;
    const footerNote = 'Si no solicitaste restablecer tu contraseña, tu cuenta sigue estando segura y puedes ignorar este mensaje.';

    const html = buildEmailTemplate({
      title,
      userName,
      bodyHtml,
      actionUrl: recoveryUrl,
      actionLabel: 'Restablecer Contraseña',
      footerNote,
    });

    await this.sendMail(to, subject, html, recoveryUrl);
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    fallbackUrl: string,
  ): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') || '"SCI Sistema" <no-reply@sci.local>';

    if (!this.transporter) {
      this.logger.warn(
        `[SIMULATION_EMAIL] Destinatario: ${to} | Asunto: "${subject}" | Enlace: ${fallbackUrl}`,
      );
      return;
    }

    try {
      this.logger.log(`[sendMail] Enviando correo a ${to} - Asunto: "${subject}"`);
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`[sendMail] Correo enviado exitosamente. MessageId=${info.messageId}`);
    } catch (error) {
      this.logger.error(`[sendMail] Error al enviar correo a ${to}: ${error.message}`, error.stack);
      // Imprimir URL en consola para no bloquear pruebas en desarrollo si falla SMTP
      this.logger.warn(`[sendMail Fallback Link] Enlace disponible: ${fallbackUrl}`);
    }
  }
}
