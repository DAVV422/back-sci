export interface IEmailTemplateOptions {
  title: string;
  userName: string;
  bodyHtml: string;
  actionUrl?: string;
  actionLabel?: string;
  footerNote?: string;
}

export function buildEmailTemplate(options: IEmailTemplateOptions): string {
  const { title, userName, bodyHtml, actionUrl, actionLabel, footerNote } = options;

  const buttonHtml = actionUrl && actionLabel ? `
    <tr>
      <td align="center" style="padding: 25px 0;">
        <a href="${actionUrl}" target="_blank" style="background-color: #1e3a8a; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          ${actionLabel}
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 0 20px 0; font-size: 13px; color: #6b7280; word-break: break-all; text-align: center;">
        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br/>
        <a href="${actionUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${actionUrl}</a>
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
                SISTEMA DE COMANDO DE INCIDENTES (SCI)
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; color: #1f2937; font-size: 16px; line-height: 1.6;">
              <h2 style="color: #1e3a8a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">${title}</h2>
              <p style="margin-top: 0; margin-bottom: 16px;">Estimado(a) <strong>${userName}</strong>,</p>
              ${bodyHtml}
            </td>
          </tr>

          <!-- Action Button -->
          ${buttonHtml}

          <!-- Footer note -->
          ${
            footerNote
              ? `
          <tr>
            <td style="padding: 0 32px 20px 32px; font-size: 14px; color: #4b5563; line-height: 1.5;">
              ${footerNote}
            </td>
          </tr>
          `
              : ''
          }

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
              <p style="margin: 0 0 4px 0;">Este es un mensaje automático enviado por el Sistema SCI. Por favor no responda a este correo.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Sistema de Comando de Incidentes. Todos los derechos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
