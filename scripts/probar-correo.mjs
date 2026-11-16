// Comprueba la configuración SMTP sin tocar la base ni crear usuarios: abre la conexión, se
// autentica y manda un correo de prueba. Útil para separar "la clave está mal" de "el dominio no
// está verificado" antes de culpar a la aplicación.
//
// Uso (desde back-sci):
//   node scripts/probar-correo.mjs tu@correo.com
//   node scripts/probar-correo.mjs tu@correo.com --solo-conexion   (no envía nada)
//
// Lee las variables del .env y nunca imprime la clave. Con Resend sin dominio verificado, el único
// destinatario permitido es el correo de la cuenta; ver infra/correo-resend.md.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const env = {};
for (const linea of readFileSync(resolve(raiz, '.env'), 'utf8').split(/\r?\n/)) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  const valor = m[2].trim();
  // Solo se quitan las comillas si envuelven todo el valor: `"EmergIA" <no-reply@...>` se conserva
  // tal cual, porque así es como se escribe un remitente con nombre visible.
  const envuelto = valor.length > 1 && (valor[0] === '"' || valor[0] === "'") && valor.at(-1) === valor[0];
  env[m[1]] = envuelto ? valor.slice(1, -1) : valor;
}

const destino = process.argv.find((a) => !a.startsWith('--') && a.includes('@'));
const soloConexion = process.argv.includes('--solo-conexion');

if (!destino && !soloConexion) {
  console.error('Falta el destinatario:  node scripts/probar-correo.mjs tu@correo.com');
  process.exit(1);
}

const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = env;
if (!host || !user || !pass) {
  console.error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS en el .env: la API estaría en modo simulado.');
  process.exit(1);
}

// Misma regla que EmailService: 465 y 2465 abren TLS desde el saludo, el resto usa STARTTLS.
const port = Number(env.SMTP_PORT) || 587;
const crudo = (env.SMTP_SECURE ?? '').trim().toLowerCase();
const secure = ['true', '1'].includes(crudo)
  ? true
  : ['false', '0'].includes(crudo)
    ? false
    : [465, 2465].includes(port);

const from = env.SMTP_FROM || '"SCI Sistema" <no-reply@sci.local>';

console.log(`Servidor   : ${host}:${port} (TLS ${secure ? 'directo' : 'por STARTTLS'})`);
console.log(`Usuario    : ${user}`);
console.log(`Clave      : definida, ${pass.length} caracteres (no se imprime)`);
console.log(`Remitente  : ${from}`);

const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

const explicar = (error) => {
  const texto = `${error.code ?? ''} ${error.responseCode ?? ''} ${error.message}`.toLowerCase();
  if (texto.includes('eauth') || texto.includes('535') || texto.includes('authentication')) {
    return 'La clave de API no es válida o fue revocada. Generar otra en Resend → API Keys.';
  }
  if (texto.includes('etimedout') || texto.includes('econnrefused') || texto.includes('esocket')) {
    return `No se pudo abrir la conexión. Suele ser el puerto: con SMTP_PORT=${port} hace falta SMTP_SECURE=${secure ? 'true' : 'false'}. Algunas redes también bloquean el 587; probar el 2587.`;
  }
  if (texto.includes('not verified') || texto.includes('domain') || texto.includes('403')) {
    return 'El dominio del remitente no está verificado en Resend, o el destinatario no está permitido mientras no lo esté.';
  }
  return 'Sin causa conocida: el mensaje de arriba es el que devolvió el servidor.';
};

try {
  await transporter.verify();
  console.log('\nConexión y autenticación: correctas.');
} catch (error) {
  console.error(`\nFalló la conexión: ${error.message}`);
  console.error(`→ ${explicar(error)}`);
  process.exit(1);
}

if (soloConexion) process.exit(0);

try {
  const info = await transporter.sendMail({
    from,
    to: destino,
    subject: 'Prueba de correo · EmergIA',
    html: `<p>Si lees esto, el envío de correos del SCI funciona.</p>
           <p style="color:#64748b;font-size:14px">Enviado desde <code>${host}:${port}</code> el ${new Date().toLocaleString('es-BO')}.</p>`,
  });
  console.log(`Correo aceptado para ${destino}. MessageId=${info.messageId}`);
  console.log('Si no llega en unos minutos, revisar la bandeja de no deseados y el panel de Resend → Emails.');
} catch (error) {
  console.error(`\nFalló el envío: ${error.message}`);
  console.error(`→ ${explicar(error)}`);
  process.exit(1);
}
