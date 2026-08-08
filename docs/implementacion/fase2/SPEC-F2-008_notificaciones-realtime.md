# SPEC-F2-008: Entidad `NotificationEntity` y Notificaciones (Websocket + FCM)

## Regla de referencia

- [plan_implementacion.md §1 (Fase 2) y §2 (notification)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §5 (Observabilidad / Eventos de Dominio)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

El personal de comando y operativo necesita enterarse en tiempo real de cambios críticos: traspaso de comando, finalización de formularios, y conflictos de sincronización. Se debe implementar la persistencia de notificaciones en base de datos (`NotificationEntity`), la transmisión en tiempo real vía WebSockets (NestJS Gateways) y la preparación del canal de push notifications (FCM).

## Estado actual

- No existen módulos de notificación ni WebSocket en el proyecto.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/notification/entities/notification.entity.ts` — Definición de la entidad |
| [NEW] | `src/notification/dto/read-notification.dto.ts` |
| [NEW] | `src/notification/gateways/notification.gateway.ts` — NestJS WebSocket Gateway |
| [NEW] | `src/notification/services/notification.service.ts` — Lógica de notificaciones y llamada a FCM |
| [NEW] | `src/notification/controllers/notification.controller.ts` — Controlador |
| [NEW] | `src/notification/notification.module.ts` — Módulo exportable |

## Modelo de Datos: `NotificationEntity`

> **Nota**: esta entidad no requiere soft delete. Hereda de un subset de base o define sus campos mínimos (`id`, `createdAt`).

| Atributo | Tipo DB | Campo TS | Decoradores TypeORM | Descripción |
|:---|:---|:---|:---|:---|
| `id` | `uuid` | `id` | `@PrimaryGeneratedColumn('uuid')` | PK autogenerada |
| `type` | `varchar` | `type` | `@Column({ type: 'varchar', length: 30, nullable: false })` | `ci_change` \| `form_finalized` \| `emergency_state_change` \| `sync_conflict` \| `resource_assigned` |
| `title` | `varchar(100)` | `title` | `@Column({ name: 'title', type: 'varchar', length: 100, nullable: false })` | Título de la notificación |
| `message` | `varchar(255)` | `message` | `@Column({ name: 'message', type: 'varchar', length: 255, nullable: false })` | Mensaje corto |
| `is_read` | `boolean` | `isRead` | `@Column({ name: 'is_read', type: 'boolean', default: false })` | Bandera de lectura |
| `created_at` | `timestamp` | `createdAt` | `@CreateDateColumn({ name: 'created_at', type: 'timestamp' })` | Fecha de envío |

**Relación**:
- `@ManyToOne(() => UserEntity)` con `@JoinColumn({ name: 'user_id' })` — Destinatario de la notificación.

---

## Flujo e Integración Técnica

1. **Persistencia**: El servicio `NotificationService.sendNotification(userId, type, title, message)` crea y guarda el registro.
2. **WebSocket (Sala de Usuario)**:
   - Los clientes móviles/web se conectan al gateway y se unen a su sala personal (`user_${userId}`) usando su token JWT para autenticarse en el handshake del WebSocket.
   - Al generarse la notificación, se hace un `io.to('user_' + userId).emit('notification', notificationData)`.
3. **Push Notifications (FCM - Firebase Cloud Messaging)**:
   - Se debe implementar un cliente simulado o integrado de Firebase Admin SDK que envíe la notificación push al dispositivo registrado del usuario en caso de que no esté conectado activamente por WebSocket.

## Endpoints

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `GET` | `/api/notification` | AuthGuard | `BASIC` | Listar notificaciones del usuario logueado |
| `PATCH` | `/api/notification/:id/read` | AuthGuard | `BASIC` | Marcar notificación como leída |

## Criterios de Aceptación

1. El gateway de WebSocket valida el token JWT del cliente antes de permitir la suscripción.
2. Al persistirse una notificación, se emite inmediatamente al canal de WebSocket.
3. Se implementan los endpoints para listar y marcar como leídas las notificaciones de manera segura.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test Unitario | Emitir una notificación a un usuario | Se persiste en DB y se invoca al método de transmisión WebSocket |
| Test e2e | `PATCH /api/notification/:id/read` de otro usuario | HTTP 404/403 (no debe permitir marcar notificaciones ajenas) |
