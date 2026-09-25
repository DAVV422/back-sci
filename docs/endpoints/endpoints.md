# Especificación y Catálogo de Endpoints del Backend SCI

Este documento centraliza y detalla todos los endpoints disponibles en el backend del Sistema de Comando de Incidentes (SCI) para el equipo de desarrollo de Frontend (Web y Móvil).

---

## 1. Reglas de Negocio, Roles y Matriz de Permisos

### 1.1 Jerarquía de Roles de Sistema

> **Convención Estándar de Roles**: En el sistema SCI, todos los roles se definen, almacenan y transmiten de manera estandarizada en **minúsculas**: `suadmin`, `admin`, `manager`, `advanced`, `basic`. Tanto en la base de datos como en los payloads JSON (`"role": "admin"`), parámetros de consulta (`attr=role&value=admin`) y decoradores de acceso, se emplea siempre este estándar.

| Rol | Alcance y Facultades | Restricciones |
|:---|:---|:---|
| **`suadmin`** | Super Administrador del Sistema. Nivel jerárquico máximo. Puede crear, listar, modificar y eliminar cualquier entidad o usuario (incluyendo usuarios con rol `admin`). Acceso exclusivo a endpoints de auditoría con marcas temporales de sistema (`GET /api/user/admin/all`). | Ninguna. |
| **`admin`** | Gestión administrativa de la plataforma. Puede crear, listar, modificar y eliminar usuarios (`admin`, `manager`, `advanced`, `basic`) y recursos del sistema. | **No puede** crear, ver en listados, consultar por ID, modificar, cambiar de estado ni eliminar usuarios con rol `suadmin`, ni promover a otros usuarios al rol `suadmin`. |
| **`manager`** | Gestión operativa total del sistema y recursos. Puede gestionar emergencias, equipamiento, asignaciones, cambiar la disponibilidad operativa de usuarios (`PATCH /api/user/status/:id`) y actualizar grados institucionales del personal por lote o individual (`PATCH /api/user/grades`). | **No puede** crear nuevos usuarios ni eliminarlos de la base de datos. No puede modificar roles de sistema ni interactuar con usuarios `admin` o `suadmin`. |
| **`advanced`** | Gestión operativa de emergencias, incidentes, bitácoras, formularios y recursos. | **No puede** crear, activar, desactivar ni eliminar usuarios. |
| **`basic`** | Operador táctico de campo. Solo gestiona la información de la emergencia en la que está activamente asignado según su rol/cargo SCI. | Solo accede a recursos de emergencias donde participa. |

> **Distinción Clave: Estado de Cuenta (`isActive`) vs Disponibilidad Operativa (`isOperational`)**:
> - **`isActive` (Estado de Cuenta / Acceso)**: Define si el usuario tiene permitido iniciar sesión en la plataforma (`true`) o si su cuenta está inactiva/suspendida/pendiente de activación por correo (`false`). Si `isActive = false`, el backend rechaza el login (`401 Unauthorized`).
> - **`isOperational` (Disponibilidad Operativa en Emergencias / Guardia)**: Define si el usuario se encuentra **en servicio / de guardia activa** (`true`) o **fuera de servicio / descanso** (`false`) para ser convocado a unidades de emergencia. **Un usuario con `isOperational = false` SÍ puede iniciar sesión e interactuar con la plataforma.**

---

### 1.2 Permisos Comunes Dentro de una Emergencia

Todo usuario asignado a una emergencia (sin importar si su rol de sistema es `basic`, `advanced`, `manager`, `admin` o `suadmin`) tiene permiso para:
1. **Registrar acciones en bitácora (`Action`)**: Registrar sus propios eventos y novedades operativas.
2. **Registrar y gestionar víctimas (`Victim` & `Registration`)**: Registrar datos de lesionados y triage START/SALT.
3. **Gestionar recursos (`Resource`)**: Solicitar despacho y registrar utilización de equipamiento asignado al incidente.

---

### 1.3 Reglas Específicas del Sistema de Comando de Incidentes (SCI)

1. **Comandante de Incidente (CI)**:
   - Es el responsable exclusivo del **Formulario 201** (creación, edición y finalización).
   - Es el encargado de la **Evaluación Inicial** preliminar del incidente (`POST /api/emergency/:id/assessment`).
   - Tiene facultad para crear y finalizar el **Formulario 207**.
   - Puede asignar personal a la emergencia y definir sus cargos SCI.
   - **Elevación Táctica**: Si un usuario con rol de sistema `basic` ocupa el cargo SCI de *Comandante de Incidente*, obtiene automáticamente facultades de gestión total sobre dicha emergencia (equivalente a `manager` / `admin`), limitadas estrictamente al ámbito de ese incidente.
2. **Líder de Unidad Médica (`medical_unit_leader`)**:
   - Tiene permiso expreso para crear y gestionar el **Formulario 207** (`POST /api/emergency/:id/form207`), además de los roles `manager`, `advanced` y el Comandante de Incidente.
3. **Asignación de Personal y Rol por Defecto**:
   - Al incorporar un nuevo miembro a la emergencia sin especificar cargo, el rol SCI por defecto es **Equipo de Ataque (`EQ-ATK`)**.
4. **Regla Especial del Creador de la Emergencia**:
   - Al crearse una emergencia, el usuario creador asume automáticamente la función de Comandante de Incidente inicial.
   - Es el único con permiso para convocar y asignar personal hasta que traspase formalmente el mando a otra persona.
   - **Aun cuando traspase el mando de CI a otro usuario**, el creador conserva de forma permanente la potestad de añadir personal a la emergencia por su condición de originador del incidente.
5. **Formularios Activos**:
   - En esta fase solo existen el **Formulario 201** (Resumen del Incidente) y el **Formulario 207** (Registro de Víctimas).

---

## 2. Formato Estándar de Respuesta API

Todas las respuestas del backend siguen la estructura JSON con propiedades en **`camelCase`**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mensaje descriptivo opcional",
  "data": { ... },
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

En caso de error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request",
  "traceId": "c3b9bbf4-41a6-4820-abd4-9df61a2d6356",
  "timestamp": "2026-08-19T20:30:00.000Z",
  "path": "/api/emergency"
}
```

---

### 2.1 Estándar de Filtros Combinados y Parámetros de Consulta (Query Params)

Para permitir que el Frontend gestione tablas interactivas con filtros múltiples simultáneos (sin tener que limpiar filtros ni realizar filtrados en cliente que rompan la paginación del servidor), el backend soporta **filtros combinados nativos en el servidor**:

| Parámetro | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| **`limit`** | `number` | Cantidad máxima de registros por página. | `limit=10` |
| **`offset`** | `number` | Desplazamiento / salto de registros para paginación. | `offset=0` |
| **`order`** | `string` | Dirección de ordenamiento cronológico (`ASC` o `DESC`). | `order=DESC` |
| **`search`** | `string` | **Búsqueda global por texto libre**. Busca coincidencias parciales (insensible a mayúsculas/minúsculas) en nombre, apellido y correo simultáneamente. | `search=juan` |
| **`name`** | `string` | Filtro específico por nombre de pila (coincidencia parcial `ILIKE`). | `name=Diego` |
| **`lastName`** | `string` | Filtro específico por apellido (coincidencia parcial `ILIKE`). | `lastName=Silva` |
| **`email`** | `string` | Filtro específico por correo electrónico (coincidencia parcial `ILIKE`). | `email=@sci.local` |
| **`role`** | `string` | Filtro exacto por rol institucional en minúsculas (`suadmin`, `admin`, `manager`, `advanced`, `basic`). | `role=admin` |
| **`grade`** | `string` | Filtro específico por grado institucional (coincidencia parcial). | `grade=Capitán` |
| **`isActive`** | `boolean` | Filtro por estado de cuenta en plataforma (`true` = habilitada para login, `false` = suspendida/inactiva). Acepta strings `"true"`/`"false"`. | `isActive=true` |
| **`isOperational`**| `boolean` | Filtro por disponibilidad operativa de guardia (`true` = en servicio, `false` = fuera de servicio). Acepta strings `"true"`/`"false"`. | `isOperational=true` |
| **`attr` & `value`**| `string` | Par clave-valor dinámico soportado por **retrocompatibilidad** con código cliente existente. | `attr=name&value=juan` |

#### Ejemplos de Consultas Combinadas para el Frontend:
1. **Búsqueda global por texto + Rol + Estado Operativo**:
   ```http
   GET /api/user?search=diego&role=admin&isOperational=true&limit=10&offset=0
   ```
2. **Filtrar personal de guardia disponible con rol específico**:
   ```http
   GET /api/user?role=basic&isActive=true&isOperational=true
   ```
3. **Buscar bomberos por grado y nombre**:
   ```http
   GET /api/user?name=Carlos&grade=Teniente
   ```
4. **Listar cuentas inactivas para modal de reenvío de activación**:
   ```http
   GET /api/user?isActive=false
   ```

---

## 3. Catálogo Detallado de Endpoints

### 3.1 Módulo de Autenticación (`/api`)

#### `POST /api/login`
- **Descripción**: Inicia sesión mediante correo y contraseña. Retorna Access Token JWT y Refresh Token.
- **Acceso**: Público (Rate limit: 5 req/min).
- **Body**:
  ```json
  {
    "email": "admin@sci.local",
    "password": "Password123*"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "user": { "id": "uuid", "name": "Admin", "lastName": "Sistema", "role": "suadmin", "email": "admin@sci.local", "isActive": true },
      "accessToken": "eyJhbG...",
      "refreshToken": "d8e3b..."
    }
  }
  ```

#### `POST /api/refresh-token`
- **Descripción**: Rota y genera un nuevo Access Token a partir de un Refresh Token válido.
- **Acceso**: Público (Rate limit: 10 req/min).
- **Body**:
  ```json
  {
    "refreshToken": "d8e3b..."
  }
  ```
- **Response (200)**: Retorna nuevo par de `accessToken` y `refreshToken`.

#### `POST /api/activate`
- **Descripción**: Valida el token de activación enviado por correo, establece la nueva contraseña indicada por el usuario y activa la cuenta (`isActive = true`).
- **Acceso**: Público (Rate limit: 10 req/min).
- **Body**:
  ```json
  {
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "password": "NuevaPassword123!"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Cuenta activada exitosamente. Ya puedes iniciar sesión.",
    "data": {
      "message": "Cuenta activada exitosamente. Ya puedes iniciar sesión."
    }
  }
  ```

#### `POST /api/resend-activation`
- **Descripción**: Reenvía el correo electrónico de activación con un nuevo token para usuarios con cuenta inactiva (`isActive = false`).
- **Acceso**: Público (Rate limit: 5 req/min).
- **Body**:
  ```json
  {
    "email": "juan.perez@sci.local"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Correo de activación reenviado exitosamente.",
    "data": {
      "message": "Correo de activación reenviado exitosamente."
    }
  }
  ```

#### `POST /api/checkToken?token=...`
- **Descripción**: Valida la integridad y vigencia de un token JWT.
- **Acceso**: Público.

---

### 3.2 Módulo de Usuarios (`/api/user`)

#### `POST /api/user`
- **Descripción**: Crea un nuevo usuario en la plataforma.
  - **Estado de activación (`isActive`)**: Controlado por la variable de entorno `REQUIRE_EMAIL_ACTIVATION`. Si es `false` (o no está definida), el usuario nace directamente activo (`isActive = true`). Si es `true`, nace inactivo (`isActive = false`) y se envía correo con token de activación. Puede sobreescribirse enviando `isActive` explícitamente en el body.
  - **Disponibilidad operativa (`isOperational`)**: Por defecto `true` (en servicio).
  - **Contraseña inicial (`password`)**: Es **opcional** (si no se provee, el backend genera una contraseña temporal aleatoria).
  - **Restricción de rol**: Un `admin` no puede crear usuarios con rol `suadmin` (`403 Forbidden`). Solo `suadmin` puede crear `suadmin`.
- **Acceso**: Requiere autenticación (`admin` o `suadmin`).
- **Body**:
  ```json
  {
    "name": "Juan",
    "lastName": "Pérez",
    "email": "juan.perez@sci.local",
    "password": "Password123*",
    "cellphone": "+56912345678",
    "grade": "Capitán",
    "birthdate": "1990-05-15",
    "role": "basic",
    "isOperational": true
  }
  ```

#### `GET /api/user`
- **Descripción**: Lista usuarios del sistema con soporte para **filtros combinados múltiples en el servidor** (omite metadatos de auditoría `createdAt`/`updatedAt` y oculta al superusuario `suadmin` para roles no-suadmin). Retorna tanto `isActive` (estado de cuenta) como `isOperational` (en servicio / fuera de servicio).
- **Acceso**: `admin`, `manager`, `suadmin`.
- **Query Params**: Ver [Sección 2.1](#21-estándar-de-filtros-combinados-y-parámetros-de-consulta-query-params). Admite simultáneamente:
  - `limit` (número), `offset` (número), `order` (`ASC` o `DESC`).
  - `search` (búsqueda global en nombre, apellido o email).
  - `name`, `lastName`, `email`, `role`, `grade`.
  - `isActive` (`true` o `false`), `isOperational` (`true` o `false`).
  - `attr` y `value` (retrocompatibilidad).
- **Ejemplo**: `GET /api/user?search=juan&role=basic&isOperational=true&limit=10&offset=0`

#### `GET /api/user/admin/all`
- **Descripción**: Endpoint de auditoría para `suadmin` y `admin` con soporte para **filtros combinados múltiples en el servidor**. Retorna la lista completa de usuarios **incluyendo marcas de auditoría temporales** (`createdAt`, `updatedAt`). Si el consultante es `admin`, se filtran y ocultan los usuarios con rol `suadmin` (solo visibles si quien consulta es `suadmin`).
- **Acceso**: `suadmin`, `admin`.
- **Query Params**: Ver [Sección 2.1](#21-estándar-de-filtros-combinados-y-parámetros-de-consulta-query-params). Admite los mismos parámetros y filtros combinados que `GET /api/user`.
- **Ejemplo**: `GET /api/user/admin/all?role=admin&isActive=true&order=DESC`

#### `GET /api/user/me`
- **Descripción**: Obtiene el perfil completo del usuario autenticado actual.
- **Acceso**: Autenticado (`basic` o superior).

#### `PATCH /api/user/me`
- **Descripción**: Actualiza los datos de identidad y contacto del perfil propio del usuario autenticado.
  - **Campos permitidos**: `name`, `lastName`, `cellphone`, `birthdate`, `urlImage`.
  - **Campos protegidos (NO editables por el propio usuario)**: `email`, `grade`, `role`, `isActive`, `isOperational` (requieren gestión administrativa).
- **Acceso**: Autenticado (`basic` o superior).
- **Body**:
  ```json
  {
    "name": "Juan",
    "lastName": "Pérez",
    "cellphone": "+56912345678",
    "birthdate": "1990-05-15",
    "urlImage": "https://example.com/foto.jpg"
  }
  ```

#### `GET /api/user/:id`
- **Descripción**: Obtiene el detalle de un usuario específico por su ID.
  - **Restricción de rol**: Si el usuario consultado tiene rol `suadmin` y quien consulta no es `suadmin`, el backend responde con `404 Not Found` (garantizando opacidad del superusuario).
- **Acceso**: Autenticado.

#### `PATCH /api/user/:id`
- **Descripción**: Actualiza la configuración administrativa e institucional de una cuenta de usuario por parte de `admin` o `suadmin`.
  - **Regla de negocio sobre campos editables**:
    - **Permitidos para admin/suadmin**: `email`, `role`, `grade` (grado o jerarquía institucional), `isActive` (habilitar/suspender cuenta), `isOperational` (disponibilidad operativa) y `password` (reset/cambio de contraseña).
    - **Protegidos**: Los campos de identidad personal (`name`, `lastName`, `cellphone`, `birthdate`, `urlImage`) los mantiene el propio usuario en su perfil (`PATCH /api/user/me`).
  - **Restricciones de rol**:
    - Un `admin` no puede modificar a un usuario con rol `suadmin` (`403 Forbidden`).
    - Un `admin` no puede asignar o promover a ningún usuario al rol `suadmin` (`403 Forbidden`).
- **Acceso**: Exclusivo `admin` / `suadmin`.
- **Body**:
  ```json
  {
    "email": "nuevo.correo@sci.local",
    "role": "advanced",
    "grade": "Teniente Segundo",
    "isActive": true,
    "isOperational": true
  }
  ```

#### `PATCH /api/user/grades`
- **Descripción**: Actualización masiva o individual del grado institucional (`grade`) del personal en la unidad de emergencias (utilizado para ascensos periódicos o anuales por lotes de bomberos/brigadistas).
  - **Tolerancia a fallos parciales (Partial Success)**: El endpoint procesa todos los elementos de la solicitud. Si un usuario falla (ej: ID inexistente o permisos insuficientes), esa operación se reporta con `success: false` y su mensaje de error, pero **no interrumpe ni revierte los usuarios válidos del lote**.
  - **Restricciones de rol**:
    - `suadmin`: Puede actualizar el grado de cualquier usuario institucional.
    - `admin`: Puede actualizar el grado de cualquier usuario excepto cuentas `suadmin`.
    - `manager`: Puede actualizar el grado de personal operativo (`basic`, `advanced`, `manager`). No puede modificar el grado de cuentas `admin` ni `suadmin`.
- **Acceso**: `manager`, `admin`, `suadmin` (`@RolesAccess(ROLES.MANAGER)`).
- **Body (Modalidad A: Selección múltiple con el mismo grado)**:
  ```json
  {
    "userIds": [
      "d3b07384-d113-494e-9c8e-aa8939b4e12e",
      "a1c07384-d113-494e-9c8e-aa8939b4e12f"
    ],
    "grade": "Bombero Primero"
  }
  ```
- **Body (Modalidad B: Asignación heterogénea o individual)**:
  ```json
  {
    "users": [
      {
        "userId": "d3b07384-d113-494e-9c8e-aa8939b4e12e",
        "grade": "Capitán"
      },
      {
        "userId": "a1c07384-d113-494e-9c8e-aa8939b4e12f",
        "grade": "Teniente Primero"
      }
    ]
  }
  ```
- **Response (200 OK con desglose)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Actualización de grados institucionales procesada.",
    "data": {
      "summary": {
        "total": 3,
        "successful": 2,
        "failed": 1
      },
      "results": [
        {
          "userId": "d3b07384-d113-494e-9c8e-aa8939b4e12e",
          "success": true,
          "grade": "Bombero Primero",
          "message": "Grado institucional actualizado exitosamente."
        },
        {
          "userId": "e4c08495-e224-405f-0d9f-bb9040c5f23f",
          "success": false,
          "error": "No tienes permisos para modificar el grado de un usuario Super Administrador."
        },
        {
          "userId": "f5d19506-f335-416a-1e0a-cc0151d6a34a",
          "success": true,
          "grade": "Bombero Primero",
          "message": "Grado institucional actualizado exitosamente."
        }
      ]
    }
  }
  ```

#### `PATCH /api/user/status/:id`
- **Descripción**: Cambia la disponibilidad operativa en emergencias del usuario (`isOperational`: en servicio / de guardia vs fuera de servicio / descanso).
  - **Impacto en inicio de sesión**: Poner a un usuario "fuera de servicio" (`isOperational = false`) **NO** le impide iniciar sesión en la plataforma ni bloquea su cuenta (`isActive` se mantiene intacto).
  - **Compatibilidad**: Admite `{ "isOperational": false }` y mapea también `{ "isActive": false }` por retrocompatibilidad con clientes existentes.
  - **Restricción de rol**: Un `admin` o `manager` no puede activar ni desactivar a un usuario con rol `suadmin` (`403 Forbidden`).
- **Acceso**: `admin`, `manager`, `suadmin`.
- **Body**:
  ```json
  {
    "isOperational": false
  }
  ```

#### `DELETE /api/user/:id`
- **Descripción**: Desactivación lógica (soft delete) del usuario en la base de datos (`isDeleted = true`).
  - **Restricción de rol**: Un `admin` no puede eliminar a un usuario con rol `suadmin` (`403 Forbidden`).
- **Acceso**: Exclusivo `admin` / `suadmin`.

---

### 3.3 Módulo de Cargos SCI (`/api/charge`)

#### `POST /api/charge`
- **Descripción**: Registra un nuevo cargo en el organigrama del SCI.
- **Acceso**: `admin`.
- **Body**:
  ```json
  {
    "name": "Líder de Unidad de Drones",
    "abbreviation": "LID-DRON",
    "level": 3,
    "weight": 5.4,
    "system_name": "drone_unit_leader"
  }
  ```

#### `GET /api/charge`
- **Descripción**: Lista todos los cargos estándar del organigrama SCI ordenados por nivel y peso.
- **Acceso**: Autenticado (`basic` o superior).

#### `GET /api/charge/:id` | `GET /api/charge/name/:name`
- **Descripción**: Consulta de cargo por ID o por nombre.
- **Acceso**: Autenticado.

#### `PATCH /api/charge/:id` | `DELETE /api/charge/:id`
- **Descripción**: Modificación o eliminación de un cargo.
- **Acceso**: `admin`.

---

### 3.4 Módulo de Emergencias (`/api/emergency`)

#### `POST /api/emergency`
- **Descripción**: Crea una nueva emergencia. Asigna código correlativo `EMG-XXX` y estado inicial Pendiente (`p`). El usuario creador se establece como el Comandante de Incidente inicial.
- **Acceso**: Autenticado.
- **Body**:
  ```json
  {
    "description": "Incendio estructural en sector industrial",
    "date": "2026-08-19",
    "time": "14:30",
    "coordinates_i": [-70.6506, -33.4372],
    "coordinates_pc": [-70.6510, -33.4375],
    "coordinates_e": [-70.6520, -33.4380]
  }
  ```

#### `GET /api/emergency`
- **Descripción**: Lista las emergencias registradas (con paginación y búsqueda).
- **Acceso**: Autenticado.

#### `GET /api/emergency/:id`
- **Descripción**: Obtiene el detalle completo de la emergencia (incluye evaluación inicial, personal asignado y formularios asociados).
- **Acceso**: Autenticado.

#### `PATCH /api/emergency/:id`
- **Descripción**: Actualiza datos de la emergencia (solo si no se encuentra en estado `Finalizada`).
- **Acceso**: `admin`, `manager` o Comandante del Incidente.

#### `PATCH /api/emergency/:id/state`
- **Descripción**: Transición del estado de la emergencia mediante máquina de estados (`p` Pendiente -> `a` Activa -> `f` Finalizada o `c` Cancelada).
- **Acceso**: `admin`, `manager` o Comandante del Incidente.
- **Body**: `{ "state": "a" }`

#### `DELETE /api/emergency/:id`
- **Descripción**: Soft delete de la emergencia.
- **Acceso**: `admin`.

---

### 3.5 Evaluación Inicial de Incidente (`/api/emergency/:id/assessment`)

#### `POST /api/emergency/:id/assessment`
- **Descripción**: Registra la evaluación preliminar de riesgos, magnitud y condiciones del incidente.
- **Acceso**: Comandante de Incidente o `admin`/`manager`.
- **Body**:
  ```json
  {
    "hazardAssessment": "Riesgo de colapso de estructura y propagación a bodegas colindantes.",
    "characterization": "Estructural / Químico",
    "specialConsiderations": "Presencia de cilindros de gas licuado en sector norte.",
    "initialObjectives": "Contención perimetral y evacuación de 100m a la redonda.",
    "clientGeneratedId": "uuid-offline-opcional"
  }
  ```

#### `PATCH /api/emergency/:id/assessment`
- **Descripción**: Actualiza los datos de la evaluación inicial (mientras la emergencia esté editable).

---

### 3.6 Personal Asignado a Emergencia (`/api/attend`)

#### `POST /api/attend`
- **Descripción**: Asigna un usuario a una emergencia con un cargo SCI. Si no se indica cargo, se asigna `Equipo de Ataque` por defecto. Valida exclusividad del Comandante de Incidente activo.
- **Acceso**: Creador de la emergencia, Comandante de Incidente o `manager`/`admin`.
- **Body**:
  ```json
  {
    "user": "uuid-usuario",
    "emergency": "uuid-emergencia",
    "charge": "uuid-cargo-sci",
    "is_active": true
  }
  ```

#### `GET /api/attend/emergency/:emergencyId`
- **Descripción**: Lista todo el personal asignado a la emergencia con sus cargos SCI y estados de vigencia.
- **Acceso**: Autenticado (`basic` o superior).

#### `PATCH /api/attend/:id`
- **Descripción**: Modifica el cargo o estado de asignación de un miembro (ej. traspaso de mando).
- **Acceso**: Comandante de Incidente o `manager`/`admin`.

#### `DELETE /api/attend/:id`
- **Descripción**: Desvincula o desmoviliza a un miembro de la emergencia.
- **Acceso**: Comandante de Incidente o `manager`/`admin`.

---

### 3.7 Formulario 201 — Resumen del Incidente (`/api/form201`)

#### `POST /api/emergency/:emergencyId/form201`
- **Descripción**: Crea el Formulario 201 para la emergencia. Genera código correlativo `F201-XXX`, captura un snapshot del organigrama SCI activo (`attends`) y bloquea la creación de otro F201 si ya existe uno activo.
- **Acceso**: Comandante de Incidente (`basic` con cargo CI) o `admin`/`manager`.
- **Body**:
  ```json
  {
    "incidentName": "Incendio Sector Industrial Quilicura",
    "situationSummary": "Fuego controlado en 70%. Labores de remoción.",
    "initialObjectives": "Extinción total de puntos calientes.",
    "summaryActions": "Despliegue de 3 líneas de ataque y ventilación forzada.",
    "safetyMessage": "Uso obligatorio de ERA completo en todo momento.",
    "clientGeneratedId": "uuid-offline-opcional"
  }
  ```

#### `GET /api/emergency/:emergencyId/form201`
- **Descripción**: Obtiene los Formularios 201 de la emergencia.
- **Acceso**: Autenticado.

#### `PATCH /api/form201/:id`
- **Descripción**: Actualiza el contenido del Formulario 201 (solo si no está finalizado ni la emergencia cerrada).
- **Acceso**: Comandante de Incidente o `admin`/`manager`.

#### `PATCH /api/form201/:id/finalize`
- **Descripción**: Finaliza el Formulario 201 de forma inmutable y registra la acción en la bitácora (`Action`).
- **Acceso**: Comandante de Incidente o `admin`/`manager`.

---

### 3.8 Formulario 207 — Registro de Víctimas (`/api/form207`)

#### `POST /api/emergency/:emergencyId/form207`
- **Descripción**: Crea una nueva planilla de Formulario 207 con código correlativo `F207-XXX` mediante incremento atómico seguro.
- **Acceso**: Comandante de Incidente, Líder de Unidad Médica, `manager` o `admin`.
- **Body**:
  ```json
  {
    "place_of_registration": "Puesto Médico de Avanzada (PMA) - Sector Sur",
    "attendant": "Dra. María Morales",
    "date": "2026-08-19T15:00:00Z",
    "clientGeneratedId": "uuid-offline-opcional"
  }
  ```

#### `GET /api/emergency/:emergencyId/form207`
- **Descripción**: Lista los Formularios 207 asociados a la emergencia.
- **Acceso**: Autenticado.

#### `PATCH /api/form207/:id/finalize`
- **Descripción**: Cierra y finaliza la planilla del F207 de forma inmutable.
- **Acceso**: Comandante de Incidente, Líder de Unidad Médica o `admin`/`manager`.

---

### 3.9 Gestión de Víctimas y Triage (`/api/victim` y `/api/registration`)

#### `POST /api/victim`
- **Descripción**: Registra los datos de filiación base de una víctima.
- **Acceso**: Todo personal asignado a la emergencia (`basic` o superior).
- **Body**:
  ```json
  {
    "identifier": "NN-003",
    "ageEstimated": 42,
    "gender": "Femenino",
    "cellphone": "+56987654321",
    "referenceCellphone": "+56911223344",
    "clientGeneratedId": "uuid-offline-opcional"
  }
  ```

#### `GET /api/victim/:id` | `PATCH /api/victim/:id`
- **Descripción**: Consulta o actualización de datos básicos de la víctima.
- **Acceso**: Autenticado.

#### `POST /api/form207/:form207Id/registration`
- **Descripción**: Registra un evento de clasificación de triage (START/SALT) para una víctima dentro de un F207 activo. Log inmutable (`append-only`).
- **Acceso**: Todo personal asignado a la emergencia.
- **Body**:
  ```json
  {
    "victimId": "uuid-victima",
    "classification": "rojo",
    "transferredBy": "Ambulancia SAMU Móvil 12",
    "cellphoneTransferManager": "+56955443322",
    "notes": "Politraumatismo severo, ventilación asistida.",
    "clientGeneratedId": "uuid-offline-opcional"
  }
  ```

#### `GET /api/form207/:form207Id/registration`
- **Descripción**: Lista todas las víctimas registradas en la planilla F207.

#### `GET /api/victim/:victimId/registration`
- **Descripción**: Obtiene la trazabilidad y evolución histórica de triage de una víctima a lo largo del tiempo.

---

### 3.10 Equipamiento e Inventario (`/api/equipment`)

#### `POST /api/equipment`
- **Descripción**: Da de alta un nuevo equipo o recurso en el inventario.
- **Acceso**: `admin`, `manager`.
- **Body**:
  ```json
  {
    "name": "Motosierra Stihl MS 382",
    "description": "Equipo de corte para labores de rescate",
    "totalStock": 5,
    "status": "available"
  }
  ```

#### `GET /api/equipment` | `GET /api/equipment/:id`
- **Descripción**: Consulta de inventario y stock disponible.

#### `PATCH /api/equipment/:id` | `DELETE /api/equipment/:id`
- **Descripción**: Actualización de stock/datos o eliminación de equipo.
- **Acceso**: `admin`, `manager`.

---

### 3.11 Recursos Despachados a Incidentes (`/api/resource`)

#### `POST /api/resource`
- **Descripción**: Asigna y despacha unidades de equipamiento a una emergencia, descontando automáticamente del stock disponible.
- **Acceso**: Todo usuario asignado a la emergencia (`basic` o superior).
- **Body**:
  ```json
  {
    "emergency": "uuid-emergencia",
    "equipment": "uuid-equipo",
    "amountAssigned": 2,
    "status": "deployed",
    "assignedTo": "Equipo de Ataque 1"
  }
  ```

#### `PATCH /api/resource/:id/return`
- **Descripción**: Registra la devolución de equipamiento desmovilizado, reincorporando el stock al inventario global.
- **Acceso**: `manager`, `admin` o Comandante de Incidente.
- **Body**: `{ "amountReturned": 2 }`

#### `GET /api/resource/by-emergency/:emergencyId`
- **Descripción**: Lista los recursos materiales asignados a una emergencia.

---

### 3.12 Bitácora de Eventos Operativos y Notas de Voz (`/api/action`)

#### `POST /api/action`
- **Descripción**: Registra un evento, decisión, novedad o nota de voz (con metadatos de audio) en la bitácora cronológica del incidente.
- **Acceso**: Todo usuario asignado a la emergencia (`basic` o superior).
- **Body**:
  ```json
  {
    "description": "Se completa evacuación del sector norte sin novedades.",
    "date": "2026-08-20",
    "hour": "14:30",
    "emergency": "uuid-emergencia",
    "clientGeneratedId": "uuid-offline-opcional",
    "audio": {
      "path_audio": "data/audios/userId/emergencyId/audio_123.m4a",
      "duration": 14.5,
      "file_name": "audio_123.m4a",
      "mime_type": "audio/m4a",
      "size_bytes": 524288
    }
  }
  ```

#### `POST /api/action/upload-audio/:emergencyId`
- **Descripción**: Sube un archivo de audio grabado desde el móvil y lo almacena localmente en `data/audios/{userId}/{emergencyId}/{filename}`. Registra automáticamente la entrada correspondiente en la bitácora (`ActionEntity`) con su `AudioEntity` vinculado.
- **Acceso**: Todo usuario asignado a la emergencia.
- **Form-Data (multipart/form-data)**:
  - `file`: Archivo de audio (m4a, mp3, aac, wav, ogg).
  - `description` (opcional): Descripción o transcripción preliminar (ej. `"Nota de voz de evaluación de sector"`).
  - `duration` (opcional): Duración en segundos (ej. `14.5`).
  - `clientGeneratedId` (opcional): UUID generado en offline por la app móvil.
- **Response (201)**: Retorna la acción creada con el objeto `audio` adjunto.

#### `POST /api/action/:id/audio`
- **Descripción**: Asocia metadatos de audio a una acción ya existente.
- **Acceso**: Autenticado.

#### `GET /api/action/emergency/:emergencyId`
- **Descripción**: Obtiene la línea de tiempo completa de acciones y eventos registrados en el incidente (incluyendo sus notas de voz y estados de procesamiento NLP).
- **Acceso**: Autenticado (`basic` o superior).

---

### 3.13 Notificaciones en Tiempo Real y Push (`/api/notification`)

#### `GET /api/notification`
- **Descripción**: Lista las notificaciones dirigidas al usuario autenticado ordenadas cronológicamente.
- **Acceso**: Autenticado.

#### `PATCH /api/notification/:id/read`
- **Descripción**: Marca una notificación como leída (valida pertenencia al usuario).
- **Acceso**: Autenticado.

#### `POST /api/notification/device-token`
- **Descripción**: Registra o actualiza el FCM Device Registration Token del dispositivo móvil para recibir notificaciones Push en segundo plano / pantalla apagada.
- **Acceso**: Autenticado.
- **Body**:
  ```json
  {
    "token": "fcm_device_token_string_generado_por_firebase",
    "deviceOs": "android"
  }
  ```

#### `DELETE /api/notification/device-token/:token`
- **Descripción**: Desvincula un token FCM cuando el usuario cierra sesión en el dispositivo móvil.
- **Acceso**: Autenticado.

#### **Canal WebSocket (`/notifications`)**
- **Namespace**: `/notifications`
- **Autenticación**: Token JWT provisto en el handshake (`auth: { token: '...' }`).
- **Salas Automáticas**:
  - `user_{userId}`: Notificaciones personales directas.
  - `emergency_{emergencyId}`: Al emitir evento `join_emergency`.
- **Eventos Emitidos por el Servidor**:
  - `'notification'`: Payload `{ id, type, title, message, isRead, createdAt }`.
  - `'emergency_notification'`: Novedades globales del incidente.

---

### 3.14 Sincronización por Lotes Offline (`/api/sync/batch`)

#### `POST /api/sync/batch`
- **Descripción**: Procesa la cola de operaciones acumuladas durante la pérdida de conectividad móvil. Las procesa en orden cronológico, ejecuta comprobación de idempotencia vía `client_generated_id` y emite alertas de conflicto si la emergencia fue cerrada mientras el cliente estaba offline.
- **Acceso**: Autenticado (`basic` o superior).
- **Body**:
  ```json
  {
    "operations": [
      {
        "entity": "victim",
        "action": "create",
        "clientGeneratedId": "01b9bbf4-41a6-4820-abd4-9df61a2d6356",
        "payload": {
          "identifier": "NN-004",
          "ageEstimated": 28,
          "gender": "Masculino"
        }
      },
      {
        "entity": "registration",
        "action": "create",
        "clientGeneratedId": "02b9bbf4-41a6-4820-abd4-9df61a2d6357",
        "emergencyId": "uuid-emergencia",
        "payload": {
          "form207Id": "uuid-form207",
          "victimId": "uuid-victima",
          "classification": "amarillo"
        }
      }
    ]
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Sincronización por lote procesada.",
    "data": {
      "results": [
        {
          "clientGeneratedId": "01b9bbf4-41a6-4820-abd4-9df61a2d6356",
          "entity": "victim",
          "action": "create",
          "status": "success",
          "serverId": "uuid-db-victima"
        },
        {
          "clientGeneratedId": "02b9bbf4-41a6-4820-abd4-9df61a2d6357",
          "entity": "registration",
          "action": "create",
          "status": "conflict",
          "error": "SYNC_CONFLICT_EMERGENCY_CLOSED"
        }
      ]
    }
  }
  ```

---

### 3.15 Seeder Inicial (`/api/seed`)

#### `GET /api/seed/all`
- **Descripción**: Ejecuta el seeder maestro (creación del Super Admin desde variables de entorno y carga/actualización de los 35 cargos estándar del organigrama SCI con sus pesos y abreviaturas).
- **Acceso**: Solo en entornos no productivos (`APP_PROD=false`).

#### `GET /api/seed/charges`
- **Descripción**: Carga/actualiza exclusivamente los cargos del SCI.

---

## 4. Auditoría de Flujos de Punta a Punta (End-to-End)

| Flujo Funcional | Componentes Involucrados | Estado en Backend | Observaciones de Integración Frontend |
|:---|:---|:---:|:---|
| **1. Autenticación y Control de Sesión** | `AuthController`, `UserService`, `JwtService` | ✅ 100% Operativo | Soporta rotación de Refresh Tokens y validación de vigencia. |
| **2. Alta de Emergencia y Mando Inicial** | `EmergencyController`, `AttendService` | ✅ 100% Operativo | El creador queda asociado al incidente y retiene privilegios de asignación. |
| **3. Ciclo de Vida del Formulario 201** | `Form201Controller`, `Form201Service`, `ActionService` | ✅ 100% Operativo | Valida unicidad de formulario activo, snapshot de personal y registro en bitácora al finalizar. |
| **4. Planilla 207 y Triage de Víctimas** | `Form207Controller`, `RegistrationController`, `VictimController` | ✅ 100% Operativo | Correlativo atómico `F207-XXX`, inmutabilidad de logs de triage y consulta de historial por víctima. |
| **5. Despacho y Devolución de Recursos** | `ResourceController`, `EquipmentService` | ✅ 100% Operativo | Afectación y reincorporación automática del stock disponible. |
| **6. Notificaciones en Tiempo Real y Push** | `NotificationGateway`, `NotificationService`, Firebase FCM | ✅ 100% Operativo | Soporte simultáneo para WebSockets y Push FCM para apps móviles en segundo plano. |
| **7. Sincronización Offline y Resolución de Conflictos** | `SyncController`, `SyncService` | ✅ 100% Operativo | Procesamiento secuencial por lote con manejo individual de errores y detección de `SYNC_CONFLICT_EMERGENCY_CLOSED`. |

---

## 5. Exclusiones de Alcance (Diferidos para Fase 3)

De acuerdo a la planificación técnica, los siguientes módulos **no forman parte de esta entrega** y se documentan para su posterior desarrollo:
1. **Procesamiento de Lenguaje Natural (PLN / NLP)**: Transcripción por voz a texto de novedades radiales y extracción automática de datos para bitácoras.
2. **Analítica Predictiva y Modelado Forestal**: Modelos matemáticos de propagación de incendios forestales y consumo predictivo de recursos hídricos.
