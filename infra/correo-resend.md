# Envío de correos con Resend

El sistema manda dos correos: **activación de cuenta** (cuando `REQUIRE_EMAIL_ACTIVATION=true`) y
**restablecimiento de contraseña**. Sin SMTP configurado no se cae: queda en modo simulado y escribe
el enlace en los registros, que es lo que sirve en desarrollo. En producción hace falta de verdad,
porque si nadie puede recuperar su contraseña, el administrador tiene que cambiarla a mano.

El código usa SMTP común (nodemailer), así que Resend es intercambiable con Brevo, Mailgun o
cualquier otro: solo cambian cuatro variables.

## Decisiones tomadas

| Decisión | Por qué |
|---|---|
| **Subdominio de envío `mail.emerg-ia.com`**, no el dominio raíz | Aísla la reputación: si algún día un envío del sistema termina marcado como no deseado, el que se mancha es `mail.emerg-ia.com` y no `emerg-ia.com`. Además deja el MX de la raíz enteramente libre para el correo corporativo (Google Workspace, Zoho) sin que se pisen. Es lo que recomienda Resend |
| **Una sola cuenta y un solo subdominio** para las tres copias | Sumar instituciones no debería obligar a verificar un dominio nuevo cada vez (el plan gratuito admite 3). Lo que distingue a cada copia es el remitente, no el dominio |
| **Región São Paulo (`sa-east-1`)** | La más cercana a Bolivia. **Hay que elegirla al crear el dominio**: cambiarla después obliga a borrar el dominio, volver a crearlo y rehacer los registros DNS |

Dos aclaraciones sobre el subdominio, porque confunden:

- **No hay que crearlo antes en ninguna parte.** `mail.emerg-ia.com` no necesita un registro A, ni
  apuntar al servidor, ni existir como sitio web. Es solo una identidad de correo: vive en los
  registros TXT y MX que pones abajo, y nada más.
- **`mail` suele usarse para el acceso web al correo**, y eso no choca con esto. Los registros de
  Resend van *por debajo* (`send.mail`, `resend._domainkey.mail`), no en `mail` mismo, así que si
  algún día quieres `mail.emerg-ia.com` como webmail, sigue libre.

El precio de la decisión es que el remitente pasa a ser `no-reply@mail.emerg-ia.com` en vez de
`no-reply@emerg-ia.com`. Se ve algo más técnico, pero lo que la persona lee en su bandeja es el
**nombre visible** (`EmergIA`, `Fundación Rescate Urbano`), no la dirección; hay que abrir el correo
para verla.

## 1. Crear el dominio en Resend

1. Cuenta en [resend.com](https://resend.com) (el plan gratuito alcanza de sobra: ver *Límites*).
2. **Domains → Add Domain**.
3. Nombre: **`mail.emerg-ia.com`** (el subdominio completo, no solo `emerg-ia.com`).
   Región: **São Paulo (sa-east-1)**.
4. Resend muestra una tabla con 3 registros. **Déjala abierta**: el valor del DKIM es único de tu
   dominio y no se puede adivinar ni copiar de ninguna guía.

## 2. Los registros en el panel del dominio

El DNS de `emerg-ia.com` lo sirve tu registrador (`*.orderbox-dns.com`), el mismo panel donde
pusiste los registros A de `demo`, `test` y `fru`. Los campos que te pide se corresponden así:

| Nombre del host | Tipo de registro | Dirección / Valor | Prioridad |
|---|---|---|---|
| `resend._domainkey.mail` | TXT | `p=MIGfMA0G…` ← **cópialo de Resend, es único** | — |
| `send.mail` | TXT | `v=spf1 include:amazonses.com ~all` | — |
| `send.mail` | MX | `feedback-smtp.sa-east-1.amazonses.com` | `10` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:TU-CORREO` | — |

Ojo con el detalle que más se falla aquí: **el nombre del host va sin el dominio**. Resend te muestra
los nombres completos (`send.mail.emerg-ia.com`), pero en tu panel tienes que escribir solo
`send.mail`, igual que escribiste `demo` y no `demo.emerg-ia.com`. El panel le añade el dominio solo.

Lo demás que hace fallar la verificación:

- **El MX de `send.mail` debe ser de la región que elegiste.** Si elegiste São Paulo es `sa-east-1`;
  el valor exacto lo muestra Resend. Todos los MX tienen que apuntar a la misma región, o la
  verificación da el error `multiple-regions`.
- Si el panel te añade el dominio al final del valor del MX (te queda
  `feedback-smtp.sa-east-1.amazonses.com.emerg-ia.com`), **pon un punto al final**:
  `feedback-smtp.sa-east-1.amazonses.com.` Ese punto significa "este nombre está completo, no lo
  toques".
- El **DKIM es largo** (más de 255 caracteres). Si el panel lo rechaza por longitud, busca si
  permite partirlo en trozos entre comillas; casi todos lo hacen solos.

### Por qué el DMARC va en la raíz y no en `mail`

Es el único registro que **no** lleva `.mail`, y a propósito. El DMARC se hereda: quien recibe el
correo busca primero `_dmarc.mail.emerg-ia.com` y, si no lo encuentra, usa el de la raíz. Poniéndolo
una sola vez en `_dmarc` queda cubierto `emerg-ia.com` y todos sus subdominios, incluido `mail`.

**Resend no lo pide**, pero conviene: Gmail y Outlook le dan mejor trato al correo de un dominio que
lo declara. Con `p=none` solo pides informes, no rechazas nada, así que es seguro empezar ahí. En
`rua=` pon tu correo para recibirlos.

## 3. Verificar

En Resend, **Verify DNS Records**. Suele tardar entre 15 minutos y un par de horas; el límite real es
el TTL del dominio, que hoy está en 10 h 40 min, así que si cambias un registro mal puesto puede
demorar. Para comprobar desde tu máquina sin esperar al panel:

```bash
nslookup -type=TXT resend._domainkey.mail.emerg-ia.com 8.8.8.8
nslookup -type=TXT send.mail.emerg-ia.com 8.8.8.8
nslookup -type=MX  send.mail.emerg-ia.com 8.8.8.8
nslookup -type=TXT _dmarc.emerg-ia.com 8.8.8.8
```

Si eso ya responde y Resend sigue diciendo que no, es el panel que aún no reintentó: dale otra vez.

## 4. La clave de API

**API Keys → Create API Key**, permiso **Sending access**, dominio `mail.emerg-ia.com`. Empieza por
`re_`. **Se muestra una sola vez**; si la pierdes, creas otra y borras la anterior.

Es un secreto: no va a ningún repositorio. En el servidor vive solo en `/srv/sci/.env`.

## 5. Configurarlo en el proyecto

Las variables SMTP son siempre las mismas cuatro; con Resend el usuario es literalmente `resend` y
la contraseña es la clave de API.

### En tu máquina (`back-sci/.env`)

```ini
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM="EmergIA" <no-reply@mail.emerg-ia.com>
```

`SMTP_SECURE` tiene que ir acorde al puerto: **587 y 2587 → `false`** (la conexión empieza en claro y
se cifra con STARTTLS), **465 y 2465 → `true`** (cifrada desde el saludo). Si la dejas vacía, el
sistema la deduce del puerto. Con el valor equivocado la conexión no se abre y el error no dice por
qué: se queda esperando.

### En el servidor

Las variables ya están en `compose.yml`, compartidas por las tres copias. Solo falta la clave, que
vive únicamente en `/srv/sci/.env` (los datos de acceso al servidor están en la nota interna
`server/sci/configuracion-servidor.md`, fuera de todo repositorio):

```bash
sudo nano /srv/sci/.env          # RESEND_API_KEY=re_...
cd /srv/sci && sudo docker compose up -d
```

Cada copia manda con su propio remitente, para que la institución se reconozca en la bandeja de
entrada. Los valores por defecto están en `compose.yml` y se pueden cambiar desde `/srv/sci/.env`:

| Copia | Remitente | Variable para cambiarlo |
|---|---|---|
| demo | `EmergIA Demostración <no-reply@mail.emerg-ia.com>` | `DEMO_SMTP_FROM` |
| test | `EmergIA Pruebas <no-reply@mail.emerg-ia.com>` | `TEST_SMTP_FROM` |
| fru | `Fundación Rescate Urbano <no-reply@mail.emerg-ia.com>` | `FRU_SMTP_FROM` |

La parte de antes del `<` es el nombre visible y puede ser cualquiera. La dirección de dentro **debe
ser de `mail.emerg-ia.com`**, el subdominio verificado, o Resend rechaza el envío. Si pones
`no-reply@emerg-ia.com` (sin el `mail.`) **no funciona**: para Resend es otro dominio, y ese no está
verificado.

## 6. Probar

Sin crear usuarios ni tocar la base:

```bash
npm run correo:probar -- tu@correo.com      # conexión, autenticación y un correo de prueba
npm run correo:probar -- --solo-conexion    # solo comprueba credenciales, no envía
```

Lee el `.env`, nunca imprime la clave y, si falla, traduce el error de SMTP a una causa probable.
Mientras el dominio no esté verificado, Resend solo deja enviar al correo de tu propia cuenta.

Después, la prueba de verdad es la de usuario: **¿Olvidaste tu contraseña?** en el login, con un
correo real, y que el enlace abra la pantalla de restablecimiento.

En el servidor, para ver qué pasó con un envío:

```bash
sudo docker compose logs api-fru | grep -i sendmail
```

## Límites del plan gratuito

**100 correos por día** y 3.000 al mes, 3 dominios. Al pasarse, el envío **se pausa**: no te cobran
de sorpresa. Para lo que hace el sistema (recuperar contraseña, activar cuentas) sobra; el día que no
alcance, el plan Pro son 20 USD al mes por 50.000 correos sin límite diario.

Cuidado con una cosa: los 100 diarios son **de la cuenta entera**, compartidos por las tres copias.
Si alguna vez se usa para avisos masivos, ahí sí se queda corto.

## Problemas comunes

| Síntoma | Causa casi siempre |
|---|---|
| La conexión se queda colgada y no da error claro | `SMTP_SECURE` no concuerda con el puerto. Con 587 tiene que ser `false` |
| `Invalid login` / `535` | La clave de API está mal, fue revocada o se copió con espacios |
| `The domain is not verified` | Falta terminar el paso 3, o el remitente es `@emerg-ia.com` en vez de `@mail.emerg-ia.com` |
| El dominio no verifica aunque `nslookup` ya responde | El panel de Resend no reintentó: pulsa *Verify* de nuevo |
| El `nslookup` no devuelve nada | El nombre del host quedó duplicado: mira si en el panel aparece `send.mail.emerg-ia.com.emerg-ia.com` |
| `multiple-regions` al verificar | Hay MX de dos regiones distintas. Todos tienen que ser de la misma |
| Los correos llegan a no deseados | Falta el DMARC, o el nombre visible no coincide con el dominio. Revisar también el panel de Resend → *Emails*, que muestra rebotes y quejas |
| En los registros sale `[SIMULATION_EMAIL]` | Falta `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS`: el servicio está en modo simulado y el enlace se imprime ahí |

## Activación de cuenta por correo

Hoy `REQUIRE_EMAIL_ACTIVATION=false`: el administrador crea el usuario con una contraseña y se la
pasa. Con el correo andando se puede poner en `true`, y entonces el usuario recibe un enlace y elige
su propia contraseña. Es más limpio, pero depende de que el correo llegue: si la institución trabaja
con cuentas que nadie revisa, es mejor dejarlo en `false`.
