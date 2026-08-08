# SPEC-F2-009: Módulo de Sincronización Offline (`client_generated_id` e idempotencia)

## Regla de referencia

- [plan_implementacion.md §2 (Offline) y §3 (Sync)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.3 (Transacciones/Idempotencia)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

El personal operativo en terreno frecuentemente pierde la conectividad. La aplicación móvil almacena registros localmente y los envía cuando se restablece la red. Para evitar duplicidad de registros (idempotencia) al recibir reintentos de peticiones debido a fluctuaciones de red, las entidades críticas (`form201`, `form207`, `victim` y `registration`) deben implementar el soporte para `client_generated_id` de forma nativa en sus flujos normales y de sincronización.

## Estado actual

- Las entidades de Fase 2 incorporan la columna `client_generated_id` (añadida en SPEC-F2-001, SPEC-F2-003, SPEC-F2-005, SPEC-F2-006).
- Los servicios de creación directa no consideran este identificador en sus flujos estándar.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/incident_module/form-201/services/form-201.service.ts` | Al crear, verificar si ya existe un F201 con el `clientGeneratedId`. Si existe, omitir la creación y retornar el registro existente de forma transparente (idempotencia). |
| [MODIFY] | `src/victim_registry_module/form-207/services/form-207.service.ts` | Implementar idéntico comportamiento de idempotencia con `clientGeneratedId` y saltarse el incremento del contador. |
| [MODIFY] | `src/victim_registry_module/victim/services/victim.service.ts` | Implementar comportamiento de idempotencia para la creación de víctimas. |
| [MODIFY] | `src/victim_registry_module/registration/services/registration.service.ts` | Implementar comportamiento de idempotencia para los registros de triage de víctimas. |

## Lógica General de Idempotencia en Servicios

Cada método `create()` en los servicios debe ajustarse para seguir el siguiente flujo de validación de idempotencia:

```typescript
async create(dto: CreateXxxDto): Promise<XxxEntity> {
  if (dto.clientGeneratedId) {
    // 1. Buscar si ya se procesó este identificador de cliente
    const existing = await this.repository.findOne({
      where: { clientGeneratedId: dto.clientGeneratedId }
    });
    if (existing) {
      this.logger.warn(`Registro con clientGeneratedId ${dto.clientGeneratedId} ya procesado. Retornando existente.`);
      return existing; // Retorno transparente de éxito
    }
  }

  // 2. Si no existe, proceder con la creación normal de la entidad
  // ... lógica normal del servicio
}
```

## Criterios de Aceptación

1. Si un payload de creación contiene un `client_generated_id` ya registrado en la base de datos de esa entidad, el backend no duplica el registro ni lanza un error del tipo `500` por violación de llave única. En su lugar, devuelve exitosamente el registro existente con estado HTTP `200/201`.
2. Las consultas de duplicidad se realizan antes de iniciar transacciones complejas o alterar contadores correlativos (ej. F207), evitando de esta forma saltar la numeración de los códigos.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test Unitario | Invocar `Form207Service.create()` consecutivamente con el mismo `clientGeneratedId` | Se guarda solo un registro y ambos retornos son idénticos |
| Test de Integración | Enviar concurrentemente dos peticiones de creación con el mismo `clientGeneratedId` | Se persiste una sola entidad y el sistema responde correctamente a ambas peticiones |
