# 05. Guía de Sincronización Offline-First y Resolución de Conflictos

Este documento es la guía técnica de referencia para el **equipo de desarrollo Mobile**. Explica cómo estructurar la base de datos local en el dispositivo (SQLite, Hive, Drift o Room), cómo manejar la cola de salida y cómo sincronizar operaciones con el backend mediante `POST /api/sync/batch`.

---

## 1. Principios del Diseño Offline-First

En el Sistema de Comando de Incidentes, los brigadistas en terreno pierden conectividad frecuentemente. El sistema móvil debe operar bajo el principio de **cero dependencia de red en tiempo de captura**:

1. **Captura Local Inmediata**: Cualquier acción (crear víctima, registrar triage, grabar nota de voz, redactar bitácora) se persiste primero en la base de datos local del teléfono.
2. **Generación de ID en el Cliente (`client_generated_id`)**: Cada registro nuevo creado en el dispositivo debe nacer con un UUID v4 generado localmente.
3. **Cola de Sincronización (Outbox Pattern)**: Las operaciones pendientes se apilan en una cola ordenada cronológicamente (`created_at` ascendente).
4. **Sincronización por Lote al Recuperar Conectividad**: Al detectar conexión a internet (vía `connectivity_plus` o listener de red), la app móvil envía el lote acumulado a `POST /api/sync/batch`.

---

## 2. Estructura de la Cola Local en el Dispositivo Móvil

Se recomienda que la aplicación móvil mantenga una tabla local llamada `sync_outbox`:

| Campo | Tipo | Descripción |
|:---|:---|:---|
| `id` | `INTEGER` (PK Auto) | Orden de inserción local |
| `entity` | `TEXT` | `form201` \| `form207` \| `victim` \| `registration` \| `action` |
| `action` | `TEXT` | `create` \| `update` |
| `client_generated_id` | `TEXT` (UUID) | Identificador único del registro |
| `emergency_id` | `TEXT` (UUID) | ID de la emergencia vinculada |
| `payload` | `JSON / TEXT` | Datos completos requeridos por el servicio |
| `status` | `TEXT` | `pending` \| `syncing` \| `synced` \| `conflict` \| `error` |
| `created_at` | `TIMESTAMP` | Marca temporal local del dispositivo |

---

## 3. Protocolo de Envío por Lotes (`POST /api/sync/batch`)

### 3.1 Petición enviada por la App Móvil

```http
POST /api/sync/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "operations": [
    {
      "entity": "victim",
      "action": "create",
      "clientGeneratedId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "payload": {
        "identifier": "NN-Sector-Norte",
        "ageEstimated": 35,
        "gender": "Masculino",
        "cellphone": "+56912345678"
      }
    },
    {
      "entity": "registration",
      "action": "create",
      "clientGeneratedId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "emergencyId": "c3b9bbf4-41a6-4820-abd4-9df61a2d6356",
      "payload": {
        "form207Id": "f7e6d5c4-b3a2-1987-6543-21fedcba0987",
        "victimId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "classification": "rojo",
        "notes": "Quemaduras de segundo grado en tórax",
        "transferredBy": "SAMU Móvil 10"
      }
    },
    {
      "entity": "action",
      "action": "create",
      "clientGeneratedId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "emergencyId": "c3b9bbf4-41a6-4820-abd4-9df61a2d6356",
      "payload": {
        "description": "Se logra cortar la propagación en sector este.",
        "date": "2026-08-20",
        "hour": "15:45"
      }
    }
  ]
}
```

---

## 4. Respuestas del Backend y Manejo de Conflictos

### 4.1 Respuesta Exitosa de Sincronización

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sincronización por lote procesada.",
  "data": {
    "results": [
      {
        "clientGeneratedId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "entity": "victim",
        "action": "create",
        "status": "success",
        "serverId": "4f9d2c1a-8b3e-4d5f-9a1b-3c5d7e9f1a2b"
      },
      {
        "clientGeneratedId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "entity": "registration",
        "action": "create",
        "status": "success",
        "serverId": "7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b"
      },
      {
        "clientGeneratedId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "entity": "action",
        "action": "create",
        "status": "success",
        "serverId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
      }
    ]
  }
}
```

### 4.2 Detección de Conflicto: Emergencia Cerrada (`SYNC_CONFLICT_EMERGENCY_CLOSED`)

Si una brigada estuvo offline durante 2 horas y, mientras tanto, el Comandante de Incidente en el Puesto de Comando finalizó la emergencia en la central (`state: 'f'`), el backend aplica la siguiente política:

1. **No altera los datos consolidados**: Rechaza la inserción de esa operación específica para preservar la integridad del expediente cerrado.
2. **Genera Alerta Automática**: Crea una `NotificationEntity` de tipo `sync_conflict` dirigida al usuario emisor.
3. **Responde con estatus `conflict`**:

```json
{
  "clientGeneratedId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "entity": "registration",
  "action": "create",
  "status": "conflict",
  "error": "SYNC_CONFLICT_EMERGENCY_CLOSED"
}
```

**Acción recomendada en la App Móvil ante un conflicto**:
- Marcar la operación en la base de datos local como `status: 'conflict'`.
- Mostrar una notificación visual al brigadista: *"La emergencia EMG-002 ya fue finalizada por el Comandante. Los registros capturados en modo offline se mantendrán almacenados en su dispositivo como respaldo local."*

---

## 5. Garantía de Idempotencia en Reintentos de Red

Si la aplicación móvil envía un lote y se produce un corte de señal **después** de que el backend guardó los datos pero **antes** de que el teléfono reciba el JSON de confirmación:

1. La app móvil reintentará el envío del mismo lote cuando vuelva la señal.
2. El backend verifica la existencia previa de cada `client_generated_id` antes de crear registros o incrementar contadores atómicos.
3. **Resultado**: El backend detecta los registros ya creados, omite la duplicación y responde con `status: 'success'` retornando los `serverId` previamente asignados.
4. **No se generan errores 500 por llaves duplicadas ni se alteran los correlativos `F201-XXX` o `F207-XXX`**.
