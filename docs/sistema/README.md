# Sistema de Comando de Incidentes (SCI) - Documentación General

Bienvenido a la documentación oficial y guía de referencia del sistema **SCI (Sistema de Comando de Incidentes)** para equipos de desarrollo Frontend (Web) y Móvil.

Esta documentación describe la arquitectura, reglas de negocio, flujos operativos de punta a punta, modelos de datos y guías de pantallas para que los desarrolladores de interfaz puedan implementar la aplicación web de despacho y la aplicación móvil de terreno de forma precisa y consistente con el backend.

---

## 📚 Índice de Documentación

| Documento | Contenido Principal |
|:---|:---|
| **[01. Visión General y Arquitectura](file:///c:/Proyectos/SCI/back-sci/docs/sistema/01_vision_general_y_arquitectura.md)** | Propósito del sistema, marco normativo SCI, stack tecnológico, infraestructura y protocolos de comunicación (REST, WebSocket, Push FCM). |
| **[02. Roles, Permisos y Reglas de Negocio](file:///c:/Proyectos/SCI/back-sci/docs/sistema/02_roles_y_reglas_de_negocio.md)** | Jerarquía de roles de sistema (`ADMIN`, `MANAGER`, `ADVANCED`, `BASIC`), facultades tácticas del Comandante de Incidente, cargos SCI y matriz de permisos. |
| **[03. Flujos Funcionales y Guía de Pantallas](file:///c:/Proyectos/SCI/back-sci/docs/sistema/03_flujos_funcionales_y_pantallas.md)** | Detalle paso a paso de los 9 flujos del sistema con sugerencia de vistas, componentes de interfaz y endpoints conectados para Web y Mobile. |
| **[04. Modelo de Datos y Entidades](file:///c:/Proyectos/SCI/back-sci/docs/sistema/04_modelo_de_datos_y_entidades.md)** | Diagrama entidad-relación, descripción de todas las tablas PostgreSQL, claves foráneas, índices únicos parciales y campos de auditoría. |
| **[05. Guía Offline-First y Sincronización](file:///c:/Proyectos/SCI/back-sci/docs/sistema/05_guia_offline_y_sincronizacion.md)** | Estrategia de almacenamiento local móvil, generación de `client_generated_id`, envío por lotes (`/api/sync/batch`) y resolución de conflictos. |
| **[Catálogo de Endpoints (API Reference)](file:///c:/Proyectos/SCI/back-sci/docs/endpoints/endpoints.md)** | Especificación técnica de todos los endpoints, DTOs de entrada y contratos de respuesta JSON. |

---

## 🎯 Resumen Ejecutivo del Proyecto

El sistema SCI es una plataforma integral diseñada para la **gestión, comando y control de incidentes y emergencias operativas** (incendios estructurales, forestales, rescates, eventos con víctimas masivas).

La plataforma permite:
1. **Centro de Despacho y Mando (Web)**: Creación de emergencias, asignación georreferenciada en mapa (Incidente, PC, Staging), gestión de inventario y stock de equipamiento, organigrama jerárquico de personal y seguimiento en tiempo real.
2. **Operación en Terreno (Mobile / Offline-first)**: Registro de bitácora cronológica, notas de voz con metadatos de audio, triage médico START/SALT de lesionados (Formulario 207) y resumen táctico del incidente (Formulario 201).
3. **Resiliencia ante Pérdida de Cobertura**: Capacidad completa de operar sin conexión a internet y sincronizar automáticamente operaciones al restablecerse la red sin duplicar registros ni corromper contadores atómicos.
4. **Alertas en Tiempo Real**: Notificaciones instantáneas mediante WebSockets en web y Notificaciones Push nativas (FCM) en dispositivos móviles en segundo plano.
