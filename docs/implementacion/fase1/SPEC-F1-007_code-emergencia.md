# SPEC-F1-007: Campo `code` auto-generado en `EmergencyEntity` (EMG-XXX)

## Regla de referencia

- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Campo `code` (varchar(20), unique) con formato EMG-XXX

## Descripción

La entidad `EmergencyEntity` requiere un campo `code` único con formato `EMG-XXX` (ej. `EMG-001`, `EMG-002`, …), auto-generado al crear la emergencia. El correlativo debe generarse de forma segura ante concurrencia.

## Estado actual

- [emergency.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/entities/emergency.entity.ts) no tiene campo `code`.
- [create-emergency.dto.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/dto/create-emergency.dto.ts) no incluye `code`.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/emergency/entities/emergency.entity.ts` | Agregar columna `code` (varchar(20), unique) |
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Auto-generar código correlativo en `create()` de forma atómica |

## Estrategia de generación del correlativo

Opción recomendada: query atómico dentro de la transacción de creación:

```typescript
// Dentro de una transacción
const result = await queryRunner.query(
  `SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1 AS next_val FROM emergency`
);
const nextCode = `EMG-${String(result[0].next_val).padStart(3, '0')}`;
```

> **Nota**: si el volumen de emergencias crece significativamente, considerar una tabla de secuencia auxiliar como la usada para F207 (ver Fase 2).

## Criterios de aceptación

1. Al crear una emergencia se genera automáticamente un código `EMG-XXX` donde XXX es correlativo de 3 dígitos
2. El campo `code` es `UNIQUE` en la base de datos
3. El código no requiere input del cliente (no aparece en `CreateEmergencyDto`)
4. El correlativo se genera de forma segura ante concurrencia (transacción o lock)
5. Si se superan 999 emergencias, el formato extiende naturalmente (EMG-1000, etc.)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Crear 3 emergencias secuenciales | Códigos `EMG-001`, `EMG-002`, `EMG-003` |
| Test unitario | Verificar que `code` no está en `CreateEmergencyDto` | No acepta campo `code` del cliente |
| Test de integración | Crear 2 emergencias concurrentes | Códigos únicos sin colisión (constraint UNIQUE lo garantiza) |
