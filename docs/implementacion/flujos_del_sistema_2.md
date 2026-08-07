# Flujos del Sistema SCI (v2)

Actualiza el documento de flujos original incorporando: refresh token con rotación y rate limiting, traspaso de comando transaccional, máquina de estados completa, devolución explícita de recursos, registro de víctimas sin deduplicación, sincronización offline con resultados parciales por operación, notificaciones (WebSocket + push) y los flujos de Fase 3 (ingesta a `dataset_incendio` vía NLP asíncrono y consulta de mapa de riesgo).

---

## 1. Flujo de Autenticación y Autorización

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Frontend/Móvil)
    participant Throttle as ThrottlerGuard
    participant API as AuthController
    participant DB as PostgreSQL

    Cliente->>Throttle: POST /api/login { email, password }
    alt Demasiados intentos recientes
        Throttle-->>Cliente: HTTP 429 (Too Many Requests)
    else Dentro del límite
        Throttle->>API: continúa
        API->>API: Generar traceId para la request
        API->>DB: Buscar usuario por email
        DB-->>API: UserEntity (con password hash)
        API->>API: bcrypt.compare(password, hash)
        alt Credenciales incorrectas
            API-->>Cliente: HTTP 404 { traceId }
        else Autenticación exitosa
            API->>API: Firmar accessToken (corta duración) y refreshToken (rotativo)
            API->>DB: Persistir hash del refreshToken vigente
            API-->>Cliente: HTTP 200 { accessToken, refreshToken, userDTO }
        end
    end

    Note over Cliente, API: Renovación de sesión
    Cliente->>API: POST /api/refresh-token { refreshToken }
    API->>DB: Validar refreshToken vigente (no revocado, no expirado)
    alt Inválido o revocado
        API-->>Cliente: HTTP 401 (Debe iniciar sesión nuevamente)
    else Válido
        API->>DB: Revocar refreshToken anterior y persistir el nuevo (rotación)
        API-->>Cliente: HTTP 200 { nuevo accessToken, nuevo refreshToken }
    end

    Note over Cliente, API: Peticiones autenticadas subsiguientes
    Cliente->>API: Request + Header "Authorization: Bearer <accessToken>"
    API->>API: AuthGuard valida firma/expiración
    API->>API: RolesGuard valida jerarquía de acceso
    alt Token expirado o rol insuficiente
        API-->>Cliente: HTTP 401 / 403 { traceId }
    else Autorizado
        API->>DB: Ejecutar consulta solicitada
        DB-->>API: Respuesta de base de datos
        API-->>Cliente: HTTP 200 (ApiResponse) { traceId }
    end
```

---

## 2. Flujo de Declaración de Emergencia y Evaluación Inicial

```mermaid
flowchart TD
    A[Operador reporta incidente] --> B(POST /api/emergency)
    B --> C{¿Payload válido?}
    C -- No --> D[HTTP 400 - Validation Error]
    C -- Sí --> E[Guardar EmergencyEntity, state = 'p' pendiente]
    E --> F[Crear Form201Entity base automáticamente]
    F --> G[Registrar Acción en ActionEntity: 'Apertura de Incidente']
    G --> H(POST /api/emergency/:id/assessment)
    H --> I[Registrar InitialAssessmentEntity]
    I --> J(PATCH /api/emergency/:id { state: 'a' })
    J --> K[Ver Flujo 5: Máquina de Estados]
    K --> L[Incidente activo, listo para asignación de recursos]
```

---

## 3. Flujo de Asignación y Devolución de Recursos

### 3.1 Despacho de recursos

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador SCI
    participant API as ResourceController / Service
    participant DB as PostgreSQL (Equipment & Resource)

    Operador->>API: POST /api/resource { emergencyId, equipmentId, amount }
    API->>DB: Consultar disponibilidad de equipo (availableQuantity)
    DB-->>API: EquipmentEntity
    alt amount > availableQuantity
        API-->>Operador: HTTP 400 (Cantidad no disponible en inventario)
    else Stock Suficiente
        API->>DB: Restar amount de availableQuantity en Equipment
        API->>DB: Crear ResourceEntity con amount asignado
        API->>DB: Registrar Acción en ActionEntity: 'Despacho de recurso'
        DB-->>API: Confirmación de guardado
        API-->>Operador: HTTP 201 (Resource creado con éxito)
    end
```

### 3.2 Devolución de recursos (endpoint explícito)

La devolución **no es automática** al finalizar/cancelar la emergencia: requiere una acción explícita del operador, ya que el equipo puede quedar en terreno, dañado, o requerir revisión antes de reingresar al inventario disponible.

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador SCI
    participant API as ResourceController / Service
    participant DB as PostgreSQL (Equipment & Resource)

    Operador->>API: PATCH /api/resource/:id/return { amountReturned }
    API->>DB: Obtener ResourceEntity y EquipmentEntity asociada
    alt amountReturned > cantidad pendiente por devolver
        API-->>Operador: HTTP 400 (Cantidad a devolver excede lo asignado)
    else Cantidad válida
        API->>DB: Sumar amountReturned a availableQuantity del Equipment
        API->>DB: Actualizar ResourceEntity (cantidad pendiente restante)
        API->>DB: Registrar Acción en ActionEntity: 'Devolución de recurso'
        DB-->>API: Confirmación
        API-->>Operador: HTTP 200 (Recurso devuelto, inventario actualizado)
    end
```

**Nota**: esto es posible incluso con la emergencia en estado `Finalizada`, ya que la devolución de equipamiento es logística, no una edición de los datos operativos del incidente. Debe excluirse explícitamente del bloqueo general de edición descrito en el Flujo 5.

---

## 4. Flujo de Traspaso de Comando del Incidente (transaccional)

```mermaid
sequenceDiagram
    autonumber
    actor Saliente as Comandante Saliente
    participant API as AttendService
    participant DB as PostgreSQL

    Saliente->>API: POST /api/attend/transfer-command { newUserId }
    API->>DB: Verificar F201 y F207 activos con is_finalized = true
    alt Formularios pendientes de finalizar
        API-->>Saliente: HTTP 400 (Debe finalizar formularios activos primero)
    else Formularios finalizados
        API->>DB: BEGIN TRANSACTION
        API->>DB: Desactivar AttendEntity del CI saliente
        API->>DB: Crear/activar AttendEntity del CI entrante
        alt Constraint único de CI activo violado (23505)
            DB-->>API: Error de unicidad
            API->>DB: ROLLBACK
            API-->>Saliente: HTTP 409 (Ya existe un CI activo — reintente)
        else Sin conflicto
            API->>DB: Registrar ActionEntity: 'Traspaso de Comando de X a Y'
            API->>DB: COMMIT
            DB-->>API: Confirmación
            API-->>Saliente: HTTP 200 (Comando traspasado)
        end
    end
```

---

## 5. Máquina de Estados de la Emergencia

```mermaid
flowchart TD
    P((Pendiente - p)) -->|"PATCH state=a"| A((Activa - a))
    P -->|"Cancelar + motivo obligatorio"| C((Cancelada - c))
    A -->|"Cancelar + motivo obligatorio"| C
    A -->|"Finalizar: valida F201/F207 con is_finalized=true"| F((Finalizada - f))
    F -->|"Reabrir — solo rol ADMIN"| A
    C -.->|"Estado terminal, sin transiciones salientes"| C
```

Toda transición registra una entrada en `ActionEntity` (usuario, hora, y motivo cuando aplica). Cualquier transición no representada en el diagrama debe rechazarse explícitamente con `BadRequestException`, indicando las transiciones válidas desde el estado actual.

---

## 6. Flujo de Registro de Víctima y Triage (Formulario 207)

Por decisión de negocio, **no hay deduplicación de víctimas**: cada registro crea una `VictimEntity` nueva, incluso si el teléfono coincide con uno ya existente en el sistema. Esto simplifica el flujo en campo (prioridad en triage) a costa de que el mismo individuo pueda existir como más de un registro si aparece en distintos incidentes.

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Operador de Triage
    participant API as Victim / Registration Controller
    participant DB as PostgreSQL

    Operador->>API: POST /api/victim { identifier, age, gender, cellphone, referenceCellphone }
    API->>DB: Crear VictimEntity (siempre nueva, sin búsqueda de duplicados)
    DB-->>API: VictimEntity creada
    API-->>Operador: HTTP 201 { victimId }

    Operador->>API: POST /api/form207/:id/registration { victimId, classification, transferredBy?, cellphoneTransferManager?, notes }
    API->>DB: Verificar que el Form207 no esté finalizado y la emergencia esté activa
    alt Form207 finalizado o emergencia cerrada
        API-->>Operador: HTTP 400 (No se puede registrar en un formulario cerrado)
    else Válido
        API->>DB: Crear RegistrationEntity (append-only)
        DB-->>API: Confirmación
        API-->>Operador: HTTP 201 (Víctima registrada en el F207)
    end

    Note over Operador, API: Si la clasificación de la víctima cambia (ej. de amarillo a rojo)<br/>se crea una NUEVA entrada en registration, nunca se edita la anterior
```

---

## 7. Flujo de Sincronización Offline por Lote

El lote se procesa **operación por operación**: si una falla por conflicto, el resto del lote continúa aplicándose. El cliente recibe un resultado individual por cada `clientGeneratedId` y solo reintenta las que quedaron en conflicto o error.

```mermaid
sequenceDiagram
    autonumber
    actor Mobile as App Móvil (reconectada)
    participant API as SyncController
    participant DB as PostgreSQL

    Mobile->>API: POST /api/sync/batch [ { clientGeneratedId, entity, payload }, ... ]
    loop Por cada operación, en orden cronológico
        API->>DB: ¿clientGeneratedId ya existe?
        alt Ya sincronizado antes
            API->>API: Idempotente → marcar resultado "ok" (sin reaplicar)
        else Operación nueva
            API->>DB: Verificar estado de la emergencia asociada
            alt Emergencia finalizada o cancelada
                API->>DB: Crear NotificationEntity tipo sync_conflict
                API->>API: Marcar resultado "conflict" para esta operación
            else Emergencia editable
                API->>DB: Aplicar create/update
                API->>API: Marcar resultado "ok"
            end
        end
    end
    API-->>Mobile: HTTP 200 { results: [ { clientGeneratedId, status: ok|conflict|error } ] }
    Note over Mobile: Las "ok" se eliminan de la cola local.<br/>Las "conflict"/"error" quedan visibles para revisión manual del usuario.
```

---

## 8. Flujo de Notificaciones (WebSocket + Push)

```mermaid
sequenceDiagram
    autonumber
    participant Domain as Servicio de Dominio (ej. EmergencyService, AttendService)
    participant Notif as NotificationService
    participant DB as PostgreSQL
    participant WS as NotificationsGateway (WebSocket)
    participant Push as Proveedor Push (FCM)
    actor User as Usuario destinatario

    Domain->>Notif: emit(tipo, { userId, title, message })
    Notif->>DB: Crear NotificationEntity (user_id, type, title, message, is_read=false)
    Notif->>WS: ¿Usuario conectado por WebSocket (sala user_id)?
    alt Conectado
        WS-->>User: Entrega en tiempo real por socket
    else No conectado
        Notif->>Push: Enviar notificación push (FCM)
        Push-->>User: Notificación push en el dispositivo
    end
```

---

## 9. Flujo de Ingesta de Dataset de Incendios (`dataset_incendio`)

Cubre las dos vías de carga: manual (siempre validada) y automática vía NLP (requiere validación humana antes de usarse en analítica).

```mermaid
flowchart TD
    subgraph Manual
        M1[Usuario rol MANAGER] -->|"POST /api/dataset-incendio"| M2["Crear registro<br/>source=manual, is_validated=true"]
    end

    subgraph Automático vía NLP
        N1[Usuario registra Action con texto libre] --> N2["Encolar job en BullMQ/Redis"]
        N2 --> N3["Worker envía texto a Servicio Python: POST /nlp/extract"]
        N3 --> N4{"¿Servicio Python responde a tiempo?"}
        N4 -- "No / Error" --> N5["Reintento con backoff exponencial.<br/>El flujo operativo del SCI NO se bloquea"]
        N5 --> N3
        N4 -- "Sí" --> N6["Webhook: POST /api/internal/nlp-callback"]
        N6 --> N7["Crear registro dataset_incendio<br/>source=nlp_extracted, is_validated=false"]
        N7 --> N8["Notificar a rol MANAGER para validación"]
        N8 --> N9{"¿MANAGER valida el dato?"}
        N9 -- Rechaza --> N10["Soft delete del registro"]
        N9 -- Aprueba --> N11["PATCH /api/dataset-incendio/:id/validate<br/>is_validated=true"]
    end

    M2 --> Z["Disponible para analítica predictiva<br/>(solo registros con is_validated=true)"]
    N11 --> Z
```

---

## 10. Flujo de Consulta de Mapa de Riesgo Predictivo

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant API as PredictionController
    participant Cache as Redis (TTL corto)
    participant Python as Servicio Python (ML)

    Cliente->>API: GET /api/prediction/risk-map
    API->>Cache: ¿Existe resultado cacheado vigente?
    alt Cache HIT
        Cache-->>API: Resultado cacheado
    else Cache MISS
        API->>Python: GET /predict/risk-map (usa solo dataset_incendio con is_validated=true)
        Python-->>API: Zonas de riesgo calculadas
        API->>Cache: Guardar resultado con TTL corto
    end
    API-->>Cliente: HTTP 200 { riskZones }
```