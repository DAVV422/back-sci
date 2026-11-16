# Infraestructura: varias instituciones en un servidor

Una copia del SCI por institución, en el mismo servidor y sin tocarse entre sí. Lo que no comparten:

| | Por institución |
|---|---|
| Base de datos | `sci_demo`, `sci_test`, `sci_fru`, cada una con su rol: una copia no puede leer las tablas de otra |
| Secretos | `JWT_AUTH`, `JWT_RECOVERY` y `JWT_REFRESH_SECRET` propios: **una sesión de una no sirve en otra** |
| Archivos subidos | `datos/<institución>/` (fotos, croquis, logo, notas de voz) |
| Administrador inicial | Su correo y su contraseña |
| Nombre y logo | `INSTITUTION_NAME` siembra el primero; después lo administra el Admin desde la aplicación |
| Puerto local | 3001 demo, 3002 test, 3003 fru (solo en `127.0.0.1`) |

Comparten la imagen de la API, los archivos estáticos de la web y el servidor de Postgres.

La web se compila **una sola vez** para todas: `environment.ts` usa rutas relativas (`/api`), así que
el mismo archivo sirve en cualquier dominio o subdominio.

## Agregar otra institución

1. En `compose.yml`, copiar un bloque `api-<nombre>` y cambiar: base, usuario, `INSTITUTION_NAME`,
   los tres dominios, los tres secretos JWT, el administrador y el puerto.
2. En `postgres-init.sh`, agregar `crear_institucion <nombre> "$<NOMBRE>_PASSWORD"`. Si Postgres ya
   tiene datos, el script no se vuelve a ejecutar: hay que crear la base y el rol a mano
   (`CREATE ROLE` / `CREATE DATABASE` igual que en el script).
3. En `preparar-servidor.sh`, sumar el nombre a la lista del `for` y correrlo de nuevo con el
   `.env` renombrado, o agregar las claves a mano.
4. En `caddy/sci.caddy`, agregar el bloque del subdominio con su puerto.
5. En el DNS, un registro A del subdominio a la IP del servidor.
6. `docker compose up -d` y recargar Caddy.

## Puesta en marcha

```bash
sudo bash preparar-servidor.sh          # secretos nuevos y carpetas (no pisa un .env existente)
sudo nano /srv/sci/.env                 # agregar los correos de los administradores
cd /srv/sci && sudo docker compose build && sudo docker compose up -d
```

La web y la página de presentación son archivos estáticos en `/srv/sci/web` y `/srv/sci/landing`.

## Pendientes

- **Correo**: sin SMTP configurado no salen los correos de recuperación de contraseña.
  `REQUIRE_EMAIL_ACTIVATION=false` evita que haga falta para crear usuarios.
- **Copias de seguridad** de las bases y de `datos/<institución>/`.
- **Clave de Google Maps** restringida a los dominios en Google Cloud; sin ella el mapa no carga.
