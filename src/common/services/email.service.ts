import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildEmailTemplate } from '../templates/email/base-email.template';

/** Puertos que abren TLS desde el saludo (SMTPS). Los demás (25, 587, 2587) usan STARTTLS. */
const PUERTOS_TLS_DIRECTO = new Set([465, 2465]);

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.resolveSecure(port);

    if (user && pass && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(
        `[initTransporter] Configuración SMTP inicializada para ${host}:${port} (TLS ${secure ? 'directo' : 'por STARTTLS'})`,
      );
    } else {
      this.logger.warn(
        '[initTransporter] Variables SMTP no configuradas completamente. Servicio de Email en modo simulado (los enlaces se imprimirán en logs).',
      );
    }
  }

  /**
   * Las variables de entorno llegan como texto, y `"false"` es una cadena con contenido: nodemailer
   * la tomaba por verdadera y abría TLS desde el saludo en un puerto que espera STARTTLS, así que la
   * conexión nunca se establecía. Sin un valor explícito se deduce del puerto.
   */
  private resolveSecure(port: number): boolean {
    const raw = this.configService.get('SMTP_SECURE');
    const valor = typeof raw === 'string' ? raw.trim().toLowerCase() : raw;

    if (valor === true || valor === 'true' || valor === '1') return true;
    if (valor === false || valor === 'false' || valor === '0') return false;

    return PUERTOS_TLS_DIRECTO.has(port);
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
