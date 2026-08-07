# Flujos del Sistema SCI

Este documento detalla los flujos de interacción clave y procesos operativos dentro de la aplicación mediante diagramas de flujo y secuencia en formato Mermaid.

---

## 1. Flujo de Autenticación y Autorización

Garantiza que todas las transacciones operativas del SCI tengan firma y trazabilidad del usuario que las ejecutó.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Frontend)
    participant API as AuthController / Guard
    participant DB as PostgreSQL
    
    Cliente->>API: POST /login { email, password }
    API->>DB: Buscar usuario por email
    DB-->>API: UserEntity (con password hash)
    API->>API: Comparar hashes (bcrypt)
    alt Credenciales Incorrectas
        API-->>Cliente: HTTP 404 (Usuario o contraseña incorrecta)
    else Autenticación Exitosa
        API->>API: Firmar JWT con Payload { sub, role }
        API-->>Cliente: HTTP 200 { accessToken, userDTO }
    end

    Note over Cliente, API: Peticiones subsiguientes
    Cliente->>API: HTTP Request con Header "Authorization: Bearer <token>"
    API->>API: AuthGuard intercepta y valida expiración/firma
    API->>API: RolesGuard valida jerarquía de acceso
    alt Token Expirado o Rol Insuficiente
        API-->>Cliente: HTTP 401 / 403 (No autorizado)
    else Autorizado
        API->>DB: Ejecutar consulta solicitada
        DB-->>API: Respuesta de base de datos
        API-->>Cliente: HTTP 200 (ApiResponse)
    end
```

---

## 2. Flujo de Declaración de Emergencia y Evaluación Inicial

Proceso de apertura de un incidente en el SCI. La creación de la emergencia genera automáticamente un Formulario 201 base.

```mermaid
flowchart TD
    A[Operador reporta incidente] --> B(POST /api/emergency)
    B --> C{¿Payload válido?}
    C -- No --> D[HTTP 400 - Validation Error]
    C -- Sí --> E[Guardar EmergencyEntity en DB]
    E --> F[Crear Form201Entity base automáticamente]
    F --> G[Registrar Acción en ActionEntity: 'Apertura de Incidente']
    G --> H(POST /api/emergency/:id/assessment)
    H --> I[Registrar InitialAssessmentEntity]
    I --> J[Incidente listo para asignación de recursos]
```

---

## 3. Flujo de Asignación de Recursos e Inventario

Despacho de equipamiento del inventario general hacia la emergencia, afectando el stock disponible.

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

---

## 4. Flujo de Traspaso de Comando del Incidente

Operación crítica que transfiere la autoridad y la responsabilidad del incidente de un oficial a otro.

```mermaid
flowchart TD
    A[Comandante Saliente solicita Traspaso] --> B{¿Formularios 201 y 207 finalizados?}
    B -- No --> C[HTTP 400 - Debe finalizar formularios activos primero]
    B -- Sí --> D[POST /api/attend de nuevo Comandante con Charge 'Comandante del Incidente']
    D --> E[Desvincular o actualizar cargo del Comandante Saliente]
    E --> F[Registrar Acción en ActionEntity: 'Traspaso de Comando de X a Y']
    F --> G[Nuevo Comandante asume el control del incidente]
```

---

## 5. Flujo de Cierre de Emergencia (Finalización)

Proceso que bloquea el incidente para preservar la validez histórica de las actuaciones de emergencia.

```mermaid
sequenceDiagram
    autonumber
    actor CI as Comandante del Incidente
    participant API as EmergencyController / Service
    participant DB as PostgreSQL

    CI->>API: PATCH /api/emergency/:id { state: 'f' }
    API->>DB: Consultar formularios 201 y 207 del incidente
    DB-->>API: Formularios relacionados
    alt Existe algún formulario activo (is_finalized = false)
        API-->>CI: HTTP 400 (No se puede cerrar si hay formularios pendientes de cierre)
    else Todos los formularios cerrados
        API->>DB: Actualizar state = 'f' (Finalizada)
        API->>DB: Registrar Acción en ActionEntity: 'Emergencia finalizada'
        DB-->>API: Confirmación
        API-->>CI: HTTP 200 (Emergencia finalizada y bloqueada para edición)
    end
```
