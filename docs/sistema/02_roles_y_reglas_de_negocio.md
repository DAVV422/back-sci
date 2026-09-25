# 02. Roles, Permisos y Reglas de Negocio del SCI

Este documento establece las definiciones oficiales de roles, jerarquías de acceso y reglas de negocio del Sistema de Comando de Incidentes. Es fundamental para que los desarrolladores de Frontend y Mobile implementen los controles de navegación, botones de acción y validaciones de interfaz de forma alineada con la seguridad del backend.

---

## 1. Jerarquía de Roles de Sistema

El sistema cuenta con **5 roles de acceso técnico global** estandarizados en minúsculas:

```
           ┌──────────────────────┐
           │       suadmin        │ (Super Administrador: Control Total + CRUD admins)
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │        admin         │ (Administrador Plataforma: CRUD Usuarios hasta admin)
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │       manager        │ (Gestión Operativa Total + Guardia de Usuarios)
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │       advanced       │ (Gestión Operativa de Incidentes sin tocar Usuarios)
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │        basic         │ (Operador de Terreno / Acceso acotado a su Emergencia)
           └──────────────────────┘
```

### Tabla Comparativa de Capacidades Globales

| Funcionalidad | `suadmin` | `admin` | `manager` | `advanced` | `basic` |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Crear Usuarios Nuevos** (`POST /api/user`) | ✅ (cualquier rol) | ✅ (roles hasta `admin`) | ❌ | ❌ | ❌ |
| **Modificar Rol, Email o Estado de Usuarios** (`PATCH /api/user/:id`) | ✅ (cualquier usuario) | ✅ (solo usuarios hasta `admin`) | ❌ | ❌ | ❌ |
| **Eliminar Usuarios** (`DELETE /api/user/:id`) | ✅ (cualquier usuario) | ✅ (solo usuarios hasta `admin`) | ❌ | ❌ | ❌ |
| **Cambiar Estado Operativo / Guardia (`isOperational`)** (`PATCH /api/user/status/:id`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Lista Global de Usuarios** (`GET /api/user`) | ✅ (ve todos) | ✅ (filtrados, sin `suadmin`) | ✅ (filtrados, sin `suadmin`) | ❌ | ❌ |
| **Modificar Perfil Propio (Nombre, Apellido, Celular, Foto)** (`PATCH /api/user/me`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Crear / Editar Catálogo de Equipos** (`Equipment`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear Emergencias** (`POST /api/emergency`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Emergencias Globales** (`GET /api/emergency`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Administrar Cargos del Organigrama** (`Charge`) | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 2. Concepto de Cuenta Activa (`isActive`) vs. Guardia Operativa (`isOperational`) vs. Eliminado (`isDeleted`)

Para evitar inconsistencias en el frontend, el backend separa de forma estricta el estado de la cuenta institucional del estado de turno o guardia operativa:

- **Usuario Eliminado (Soft Delete)**: `isDeleted = true`. El usuario no existe operativamente, sus credenciales son invalidadas y no puede iniciar sesión.
- **Cuenta Desactivada / Bloqueada (`isActive = false`)**:
  - Significa que la cuenta está inhabilitada administrativamente (o pendiente de activación por correo si `REQUIRE_EMAIL_ACTIVATION=true`).
  - El usuario **no puede iniciar sesión** (retorna `401 Unauthorized`).
  - En la interfaz del admin/suadmin, a estos usuarios se les puede reenviar el enlace de activación.
- **Usuario Fuera de Guardia / No Operativo (`isOperational = false`)**:
  - Significa que el bombero o brigadista **no se encuentra disponible o de turno activo** para despachos ordinarios.
  - **SÍ puede iniciar sesión** en la plataforma normalmente y acceder a sus datos.
  - **NO debe recibir el botón "Reenviar Activación"** en el frontend, ya que su cuenta está activa.
  - Si un Comandante de Incidente decide asignarlo manualmente a una emergencia activa, puede operar normalmente.

---

## 3. Permisos Comunes Dentro de una Emergencia

Cualquier usuario con sesión activa que esté **asignado al personal de una emergencia** (`AttendEntity` activa), sin importar si su rol de sistema es `basic`, `advanced`, `manager`, `admin` o `suadmin`, cuenta con los siguientes permisos en ese incidente:

1. **Bitácora y Notas de Voz (`Action`)**: Puede registrar acciones, eventos y notas de voz con audio en la línea de tiempo del incidente.
2. **Registro de Víctimas (`Victim` & `Registration`)**: Puede registrar los datos básicos de personas lesionadas y asentar evaluaciones de triage START/SALT dentro de las planillas del Formulario 207 activas.
3. **Gestión de Recursos (`Resource`)**: Puede solicitar la asignación y recepción de equipamiento para el frente de trabajo en el que se desempeña.

---

## 4. Reglas Específicas del Sistema de Comando de Incidentes (SCI)

### 4.1 Comandante del Incidente (CI) y Elevación Táctica

El **Comandante del Incidente** es la máxima autoridad táctica en el lugar del suceso.
- **Responsabilidad del Formulario 201**: Es el único responsable de iniciar, actualizar y finalizar el Formulario 201 (Resumen del Incidente).
- **Evaluación Inicial**: Es el encargado de registrar la evaluación preliminar de riesgos y recursos requeridos (`InitialAssessment`).
- **Facultades sobre el Formulario 207**: Puede crear y finalizar planillas del Formulario 207.
- **Asignación de Personal**: Puede convocar brigadistas y asignar sus cargos SCI.
- **Regla de Elevación Táctica**: Si un usuario cuyo rol de sistema es `basic` asume el cargo SCI de *Comandante del Incidente*, obtiene **permisos de gestión total sobre esa emergencia específica** (equivalentes a `manager`/`admin`), pero única y exclusivamente limitados al perímetro de ese incidente.

---

### 4.2 Regla Especial del Creador de la Emergencia

1. Al crearse una nueva emergencia (`POST /api/emergency`), el usuario creador se establece automáticamente como el **Comandante de Incidente inicial**.
2. En ese momento, es el único operador con facultad para añadir y convocar personal al incidente hasta que designe o traspase el mando de CI a otra persona.
3. **Persistencia del Privilegio**: Incluso si el creador traspasa el cargo de Comandante de Incidente a otro oficial, **el creador conserva de forma permanente el permiso de añadir personal a la emergencia** por su condición de originador del incidente.

---

### 4.3 Líder de la Unidad Médica (`medical_unit_leader`)

- En el organigrama SCI, la Unidad Médica pertenece a la Rama de Servicios de la Sección de Logística.
- El usuario con cargo SCI de *Líder de Unidad Médica* tiene **permiso expreso para crear y finalizar el Formulario 207** (`POST /api/emergency/:id/form207`), aliviando la carga administrativa del Comandante de Incidente en eventos con víctimas en masa.
- Los roles de sistema `manager` y `admin` (y `suadmin`) también pueden crear el Formulario 207.

---

### 4.4 Asignación de Personal y Rol por Defecto

- Cuando se asigna personal a una emergencia (`POST /api/attend`) sin especificar un cargo particular en la interfaz, el sistema asigna automáticamente el cargo **Equipo de Ataque (`EQ-ATK` / `attack_team`)**, correspondiente al Nivel 5 del organigrama.
- **Unicidad de Mando**: En una misma emergencia **solo puede existir un Comandante del Incidente activo a la vez**. Para nombrar a un nuevo CI, se debe desactivar o reasignar la asignación anterior.

---

### 4.5 Máquina de Estados de la Emergencia y Bloqueo de Edición (`assertEditable`)

Las emergencias operan bajo una máquina de estados estricta:

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Pendiente   │ ───►  │    Activa    │ ───►  │  Finalizada  │ (Solo Lectura)
│     (p)      │       │     (a)      │       │     (f)      │
└──────┬───────┘       └──────┬───────┘       └──────────────┘
       │                      │
       └──────────────┬───────┴─────────────► ┌──────────────┐
                      │                       │  Cancelada   │ (Solo Lectura)
                      └─────────────────────► │     (c)      │
                                              └──────────────┘
```

- **Regla de Cierre Inmutable (`assertEditable`)**: Cuando una emergencia pasa al estado **Finalizada (`f`)** o **Cancelada (`c`)**:
  - Se bloquea la creación y edición de Formularios 201 y 207.
  - Se bloquea la asignación de personal (`attend`) y despacho de recursos (`resource`).
  - Se bloquea el registro de triage de nuevas víctimas.
  - Cualquier intento de modificación retornará `HTTP 400 Bad Request` indicando que la emergencia se encuentra cerrada.
