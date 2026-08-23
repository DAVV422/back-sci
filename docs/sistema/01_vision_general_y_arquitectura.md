# 01. Visión General y Arquitectura del Sistema SCI

## 1. Introducción y Dominio del Problema

El **Sistema de Comando de Incidentes (SCI / ICS)** es el modelo estandarizado internacional para el mando, control y coordinación de respuestas ante situaciones de emergencia.

En situaciones críticas (incendios, rescates vehiculares, emergencias químicas, terremotos), múltiples organismos (Bomberos, Servicios de Salud, Policía, Defensa Civil) deben coordinarse bajo una sola estructura organizativa sin duplicar esfuerzos ni saturar las líneas de comunicación.

### Objetivos Clave de la Plataforma SCI
1. **Unidad de Mando y Trazabilidad**: Todo el personal asignado a una emergencia responde a una cadena jerárquica clara con un único Comandante del Incidente activo.
2. **Registro Inmutable y Bitácora**: Cada decisión, novedad táctica, despacho de recursos y evaluación médica queda auditado con fecha, hora y usuario responsable.
3. **Disponibilidad Offline en Terreno**: Las brigadas de campo frecuentemente operan en zonas remotas sin señal celular. La aplicación permite capturar datos localmente y sincronizarlos cuando regresa la conectividad.
4. **Multicanalidad de Notificaciones**: Alertas críticas en tiempo real vía WebSockets para operadores de central web y Push Notifications para brigadistas móviles con pantalla apagada.

---

## 2. Arquitectura Tecnológica del Backend

El backend está desarrollado sobre **NestJS** bajo un enfoque modular, limpio y desacoplado, garantizando alta mantenibilidad y escalabilidad.

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIENTES FRONTEND & MOBILE                  │
│   Web Dashboard (React/Next/Vue)  |  Mobile App (Flutter)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTP / REST (JSON)            │ WebSockets
               │ Multipart (Audios)            │ Push FCM
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CAPA DE ENTRADA Y SEGURIDAD                 │
│  - TraceIdMiddleware (UUID de trazabilidad por request)     │
│  - ThrottlerGuard (Protección DDoS / Rate Limiting)         │
│  - AuthGuard (JWT Passport) + RolesGuard (@RolesAccess)     │
│  - ValidationPipe (Class Validator & DTO Sanitization)      │
│  - AuditLogInterceptor (Auditoría automática de peticiones) │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  MÓDULOS DE DOMINIO Y LÓGICA                │
│  - AuthModule & UserModule                                  │
│  - EmergencyModule (Máquina de estados + Geo Coordenadas)   │
│  - AttendsModule & ChargesModule (Organigrama SCI)          │
│  - ActionModule (Bitácora + Audios + Speech-to-Text ready)  │
│  - Form201Module & Form207Module (Formularios SCI)          │
│  - VictimModule & RegistrationModule (Triage START/SALT)    │
│  - EquipmentModule & ResourceModule (Inventario y Despacho) │
│  - NotificationModule (Gateways WebSocket + Firebase FCM)   │
│  - CommonModule (SyncService offline batch + AuditLogs)     │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA                     │
│  - PostgreSQL (Base de datos relacional principal)          │
│  - TypeORM con BaseEntity (Soft delete universal)           │
│  - Transacciones ACID y Contadores Atómicos (UPSERT)        │
│  - Almacenamiento Local de Audios: data/audios/{user}/{emg} │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

| Componente | Tecnología | Versión / Detalle |
|:---|:---|:---|
| **Lenguaje** | TypeScript | v5.1+ |
| **Framework Web** | NestJS | v10.x |
| **Base de Datos** | PostgreSQL | v14+ |
| **ORM** | TypeORM | v0.3.20 con `typeorm-naming-strategies` (Snake Case) |
| **Autenticación** | Passport JWT | Access Token (1d) + Refresh Token rotativo (7d) con bcrypt |
| **WebSockets** | Socket.IO / `@nestjs/websockets` | Namespace `/notifications`, salas privadas por usuario y por emergencia |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | `firebase-admin` SDK v12 con despacho multicast y limpieza automática de tokens |
| **Archivos de Audio** | Multer (`diskStorage`) | Almacenamiento organizado en `data/audios/{userId}/{emergencyId}/` |
| **Logging y Trazabilidad**| Pino (`nestjs-pino`) | Logs JSON estructurados de alto rendimiento con `traceId` |
| **Documentación API** | Swagger / OpenAPI | OpenAPI v3 generado con decoradores en `@nestjs/swagger` |

---

## 4. Estructura de Directorios del Código Fuente

```
src/
├── auth/                    # Autenticación JWT, Refresh Tokens, Guards y Decoradores
├── common/                  # Middleware de traceId, DTOs de búsqueda, sync offline, auditoría
├── config/                  # Configuración TypeORM, base de datos y logger Pino
├── incident_module/
│   ├── action/              # Bitácora cronológica de incidentes y notas de voz (audios)
│   └── form-201/            # Formulario 201 (Resumen del Incidente y Snapshot SCI)
├── notification/            # WebSocket Gateway, Push FCM y gestión de tokens de dispositivos
├── organization_module/
│   ├── attends/             # Personal asignado a emergencias y cargos activos
│   ├── emergency/           # Emergencias, coordenadas y evaluación inicial
│   ├── equipment/           # Catálogo e inventario de equipamiento disponible
│   └── resource/            # Despacho y devolución de equipamiento a incidentes
├── sci_module/
│   └── charges/             # Catálogo de Cargos SCI (35 posiciones, niveles y pesos)
├── seeder/                  # Seeder para Super Admin y organigrama estándar
├── user/                    # Gestión de usuarios, perfiles y estados de activación
└── victim_registry_module/
    ├── form-207/            # Formulario 207 (Planilla de víctimas con contador atómico)
    ├── registration/        # Logs inmutables de clasificación de triage (START/SALT)
    └── victim/              # Datos demográficos y de filiación de víctimas
```
