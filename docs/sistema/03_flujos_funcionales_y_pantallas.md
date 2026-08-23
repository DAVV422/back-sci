# 03. Flujos Funcionales y Guía de Pantallas (Frontend & Mobile)

Este documento es una guía práctica de diseño e implementación para los desarrolladores de **Frontend Web (Centro de Despacho)** y **Mobile (App de Terreno)**. Detalla paso a paso cada flujo operativo, qué pantallas construir, qué controles mostrar y qué endpoints consumir.

---

## 📋 Resumen de Flujos Soportados

| # | Flujo Operativo | Plataforma Principal | Endpoints Clave |
|:---:|:---|:---:|:---|
| **1** | Autenticación, Control de Sesión y Perfil | Web & Mobile | `/api/login`, `/api/refresh-token`, `/api/user/me` |
| **2** | Creación, Georreferenciación y Estados de Emergencia | Web (Central) & Mobile | `/api/emergency`, `/api/emergency/:id/state` |
| **3** | Evaluación Inicial de Riesgos | Web & Mobile | `/api/emergency/:id/assessment` |
| **4** | Organigrama SCI y Convocatoria de Personal | Web & Mobile | `/api/attend`, `/api/charge` |
| **5** | Formulario 201 (Resumen de Incidente y Snapshot SCI) | Web & Mobile (CI) | `/api/emergency/:id/form201`, `/api/form201/:id/finalize` |
| **6** | Formulario 207 y Triage de Víctimas (START/SALT) | Mobile & Web (PMA) | `/api/form207`, `/api/victim`, `/api/registration` |
| **7** | Inventario, Despacho y Devolución de Recursos | Web & Mobile | `/api/equipment`, `/api/resource` |
| **8** | Bitácora Operativa y Grabación de Notas de Voz | Mobile (Terreno) & Web | `/api/action`, `/api/action/upload-audio/:emergencyId` |
| **9** | Notificaciones en Tiempo Real y Push FCM | Web (Socket) & Mobile (Push) | Namespace `/notifications`, `/api/notification/device-token` |
| **10**| Sincronización Offline por Lotes y Conflictos | Mobile (Offline-first) | `/api/sync/batch` |

---

## Flujo 1: Autenticación, Sesión y Perfil

```
[Usuario] ──(Email/Password)──► [POST /api/login] ──► [Recibe AccessToken + RefreshToken + User]
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                        ▼                                       ▼
                             [Guardar Tokens Seguro]                  [Conectar WebSocket / FCM]
```

### Pantallas Sugeridas
1. **Pantalla de Login**:
   - Campos: Correo electrónico, Contraseña.
   - Botón: "Iniciar Sesión".
   - Al autenticar: Guardar `accessToken` en almacenamiento seguro (SecureStorage en móvil, memoria/cookie segura en web) y registrar el token FCM si es móvil.
2. **Pantalla de Perfil Propio (`/profile` o `/me`)**:
   - Consume `GET /api/user/me`.
   - Permite editar teléfono, grado o fecha de nacimiento consumiendo `PATCH /api/user/me`.
3. **Gestión de Usuarios (Solo `ADMIN` y `MANAGER`)**:
   - `ADMIN`: Botón "Nuevo Usuario" (`POST /api/user`) y botón "Eliminar" (`DELETE /api/user/:id`).
   - `MANAGER` / `ADMIN`: Switch / Toggle "Activo / Inactivo" (`PATCH /api/user/status/:id`).

---

## Flujo 2: Creación, Georreferenciación y Estados de Emergencia

```
[Operador] ──► [Formulario Alta Emergencia] ──► [POST /api/emergency] ──► [Código EMG-XXX asignado]
                      │ (Coordenadas Mapa)                                       │
                      └──────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                     [Transición de Estado: Pendiente -> Activa -> Finalizada]
```

### Pantallas Sugeridas
1. **Mapa General de Incidentes (Dashboard Web)**:
   - Visualización de Leaflet/Mapbox con pines de emergencias activas.
   - 3 tipos de coordenadas por incidente:
     - 🔴 **Incidente (`coordinates_i`)**: Punto cero del fuego o evento.
     - 🔵 **Puesto de Comando (`coordinates_pc`)**: Ubicación física del PC.
     - 🟡 **Área de Espera / Staging (`coordinates_e`)**: Concentración de recursos y vehículos.
2. **Modal / Formulario de Nueva Emergencia**:
   - Campos: Descripción, Fecha, Hora, Selectores de coordenadas en mapa interactivo.
3. **Barra de Control de Estado de Emergencia**:
   - Botones visibles solo para Comandante de Incidente, `MANAGER` o `ADMIN`:
     - "Activar Incidente" (`state: 'a'`)
     - "Finalizar Incidente" (`state: 'f'`)
     - "Cancelar Incidente" (`state: 'c'`)

---

## Flujo 3: Evaluación Inicial de Riesgos (`InitialAssessment`)

### Pantallas Sugeridas
1. **Formulario de Evaluación Inicial**:
   - Acceso: Comandante de Incidente o Central.
   - Campos:
     - Evaluación de Riesgos y Amenazas (`hazardAssessment`).
     - Caracterización del Incidente (`characterization`, ej. Estructural, Forestal, HAZMAT).
     - Consideraciones Especiales (`specialConsiderations`).
     - Objetivos Iniciales de Respuesta (`initialObjectives`).
   - Botón: "Guardar Evaluación Inicial" (`POST /api/emergency/:id/assessment`).

---

## Flujo 4: Organigrama SCI y Convocatoria de Personal

```
[Comandante / Manager] ──► [Seleccionar Usuario + Cargo SCI] ──► [POST /api/attend]
                                                                        │
                         ┌──────────────────────────────────────────────┘
                         ▼
       [Actualización del Organigrama Táctico en Tiempo Real]
```

### Pantallas Sugeridas
1. **Vista de Organigrama SCI (Árbol Jerárquico)**:
   - Renderizado del árbol de mando del incidente:
     - **Nivel 1**: Comandante del Incidente (CI).
     - **Nivel 2**: Oficiales de Estado Mayor (Seguridad, Información, Enlace) y Jefes de Sección (Operaciones, Planificación, Logística, Finanzas).
     - **Nivel 3**: Ramas, Divisiones, Grupos y Unidades.
     - **Nivel 4**: Comunicaciones, Médica, Alimentación, Suministros, Transporte.
     - **Nivel 5**: Equipos de Ataque, Rescatistas, Paramédicos, Bomberos.
2. **Modal "Añadir Miembro al Incidente"**:
   - Selector de usuario (consume `GET /api/user`).
   - Selector de Cargo SCI (consume `GET /api/charge`, ordenado por nivel y peso).
   - Valor por defecto si no se selecciona cargo: **Equipo de Ataque (`EQ-ATK`)**.
3. **Acción "Traspasar Mando de CI"**:
   - Cambia la asignación del cargo CI a otro miembro activo previa confirmación.

---

## Flujo 5: Formulario 201 (Resumen del Incidente)

```
[Comandante de Incidente] ──► [Crear Formulario 201] ──► [POST /api/emergency/:id/form201]
                                                                  │
                                ┌─────────────────────────────────┘
                                ▼
         [Generación F201-001 + Snapshot Automático del Organigrama]
                                │
                                ▼
         [Edición durante la operación -> Finalización inmutable]
```

### Pantallas Sugeridas
1. **Pestaña Formulario 201**:
   - Si no existe un F201 activo: Botón "Iniciar Formulario 201".
   - Si ya existe un F201 activo: Muestra la vista de edición con:
     - Nombre del incidente (`incidentName`).
     - Resumen de situación (`situationSummary`).
     - Objetivos iniciales (`initialObjectives`).
     - Acciones realizadas (`summaryActions`).
     - Mensaje de seguridad para las brigadas (`safetyMessage`).
     - **Organigrama congelado (Snapshot)**: Lista del personal asignado capturado al crear el formulario.
2. **Botón "Finalizar Formulario 201"**:
   - Consume `PATCH /api/form201/:id/finalize`.
   - Deja el formulario en modo de solo lectura y genera una acción automática en la bitácora.

---

## Flujo 6: Formulario 207 y Triage de Víctimas (START / SALT)

```
[Puesto Médico / Brigadista] ──► [Crear Planilla F207-001] ──► [Registrar Víctima (NN-001)]
                                                                      │
                                                                      ▼
                                                       [Clasificar Triage START]
                                                       (Rojo / Amarillo / Verde / Negro)
                                                                      │
                                                                      ▼
                                                       [Historial Evolutivo Triage]
```

### Pantallas Sugeridas
1. **Planilla del Formulario 207 (Web / Tablet / Mobile)**:
   - Botón "Nueva Planilla F207" (`POST /api/emergency/:emergencyId/form207`): Genera `F207-XXX` atómico.
   - Lista de planillas creadas con indicador de estado (Abierta / Finalizada).
2. **Modal / Vista "Registrar Víctima y Triage"**:
   - **Datos de la Víctima**: Identificador (ej. `NN-001` o Nombre), Edad estimada, Género, Teléfono de contacto.
   - **Selector de Triage (Código de Colores START/SALT)**:
     - 🔴 **Rojo (Inmediato / Crítico)**: Requiere atención médica urgente.
     - 🟡 **Amarillo (Diferido / Grave)**: Lesiones de consideración, hemodinámicamente estable.
     - 🟢 **Verde (Leve / Ambulatorio)**: Puede caminar y valerse por sí mismo.
     - ⚫ **Negro (Fallecido / No Salvable)**: Sin signos vitales.
   - **Datos de Traslado**: Vehículo/Móvil de traslado (ej. `SAMU Móvil 4`), Teléfono del encargado, Notas clínicas.
3. **Línea de Tiempo Médica de la Víctima (`GET /api/victim/:id/registration`)**:
   - Muestra cómo ha evolucionado la clasificación de la víctima a lo largo del tiempo (ej. comenzó en Rojo y tras estabilización pasó a Amarillo).

---

## Flujo 7: Inventario, Despacho y Devolución de Recursos

### Pantallas Sugeridas
1. **Catálogo de Inventario Global (`/equipment`)**:
   - Tabla de herramientas y vehículos con stock total y disponible.
2. **Panel de Despacho de Recursos a la Emergencia**:
   - Selector de equipo + Cantidad a despachar + Frente asignado (ej. "Sector Norte - Brigada 2").
   - Consume `POST /api/resource`. El backend descuenta automáticamente el stock disponible.
3. **Acción "Devolver / Desmovilizar Recurso"**:
   - Botón "Devolver al Inventario" (`PATCH /api/resource/:id/return`) con cantidad devuelta, reincorporando el stock.

---

## Flujo 8: Bitácora Operativa y Grabación de Notas de Voz

```
[Operador Móvil en Terreno]
            │
            ├─► [Opción A: Texto] ──► [POST /api/action] ───────────────┐
            │                                                           ▼
            └─► [Opción B: Audio] ──► [POST /api/action/upload-audio] ──► [Línea de Tiempo]
                                                                        (Acciones + Reproductor)
```

### Pantallas Sugeridas (Mobile First)
1. **Línea de Tiempo de Bitácora (`/emergency/:id/actions`)**:
   - Feed cronológico de novedades con hora, autor y descripción.
   - Si la acción tiene un audio adjunto (`action.audio` presente): Muestra un **reproductor de audio integrado** con duración y botón play/pause.
2. **Barra de Entrada de Novedades**:
   - Campo de texto para escribir novedad rápida.
   - **Botón de Micrófono (Presionar para grabar)**:
     - Graba audio local en formato `.m4a` o `.mp3`.
     - Al soltar: Sube el archivo con `POST /api/action/upload-audio/:emergencyId` (multipart) enviando `file`, `duration` y `clientGeneratedId`.

---

## Flujo 9: Notificaciones en Tiempo Real y Push FCM

### Implementación Frontend (Web)
1. Conectar Socket.IO al namespace `/notifications` enviando el token en el handshake:
   ```javascript
   const socket = io('http://localhost:3000/notifications', {
     auth: { token: accessToken }
   });
   socket.on('notification', (data) => {
     mostrarToast(data.title, data.message);
     reproducirSonidoAlerta();
   });
   ```
2. Al ingresar a una emergencia específica:
   ```javascript
   socket.emit('join_emergency', emergencyId);
   socket.on('emergency_notification', (data) => { ... });
   ```

### Implementación Mobile (Push Notifications)
1. Obtener el Token FCM de Firebase Messaging en la app móvil.
2. Registrar el token en el backend tras el login:
   ```http
   POST /api/notification/device-token
   { "token": "fcm_token_aqui", "deviceOs": "android" }
   ```
3. Al cerrar sesión: invocar `DELETE /api/notification/device-token/:token`.

---

## Flujo 10: Sincronización Offline por Lotes (`/api/sync/batch`)

Para el diseño de la base de datos local (SQLite/Hive/WatermelonDB) y el motor de cola de sincronización, consultar la **[Guía Offline-First](file:///c:/Proyectos/SCI/back-sci/docs/sistema/05_guia_offline_y_sincronizacion.md)**.
