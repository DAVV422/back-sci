/**
 * Catálogo de cargos del SCI según el Manual de Campo (USAID/OFDA/LAC), con su terminología
 * latinoamericana. Es la fuente única: `ChargeCatalogService.sync()` alinea la tabla `charge`
 * con esta lista al arrancar y desde el seeder.
 *
 * - `systemName` es la clave estable que usa el código (permisos, CI). No se reutiliza.
 * - `aliases` y `legacySystemNames`: nombres y claves anteriores. La sincronización los
 *   encuentra y los renombra en el mismo registro, así las asignaciones existentes se conservan.
 * - `level` es la fila del organigrama y `weight` el orden dentro de ella (Operaciones 5.x,
 *   Planificación 6.x, Logística 7.x, Administración y Finanzas 8.x).
 */
export interface SciChargeDefinition {
  readonly systemName: string;
  readonly name: string;
  readonly abbreviation: string;
  readonly level: number;
  readonly weight: number;
  readonly aliases?: readonly string[];
  readonly legacySystemNames?: readonly string[];
}

export const SCI_CHARGE_CATALOG: readonly SciChargeDefinition[] = [
  // ===== Nivel 1: Mando =====
  { systemName: 'incident_commander', name: 'Comandante del Incidente', abbreviation: 'CI', level: 1, weight: 1.0 },
  { systemName: 'deputy_incident_commander', name: 'Comandante Adjunto', abbreviation: 'CI-ADJ', level: 1, weight: 1.5 },

  // ===== Nivel 2: Staff de Comando =====
  { systemName: 'safety_officer', name: 'Oficial de Seguridad', abbreviation: 'OFS', level: 2, weight: 2.1 },
  { systemName: 'public_info_officer', name: 'Oficial de Información Pública', abbreviation: 'OFIP', level: 2, weight: 2.2 },
  { systemName: 'liaison_officer', name: 'Oficial de Enlace', abbreviation: 'OFE', level: 2, weight: 2.3 },

  // ===== Nivel 2: Jefes de Sección =====
  { systemName: 'operations_chief', name: 'Jefe de la Sección de Operaciones', abbreviation: 'JSO', level: 2, weight: 5.0, aliases: ['Jefe de Operaciones'] },
  { systemName: 'planning_chief', name: 'Jefe de la Sección de Planificación', abbreviation: 'JSP', level: 2, weight: 6.0, aliases: ['Jefe de Planificación'] },
  { systemName: 'logistics_chief', name: 'Jefe de la Sección de Logística', abbreviation: 'JSL', level: 2, weight: 7.0, aliases: ['Jefe de Logística'] },
  { systemName: 'admin_finance_chief', name: 'Jefe de la Sección de Administración y Finanzas', abbreviation: 'JSAF', level: 2, weight: 8.0, aliases: ['Jefe de Administración y Finanzas'] },

  // ===== Nivel 3: Sección de Operaciones =====
  { systemName: 'staging_area_manager', name: 'Encargado del Área de Espera', abbreviation: 'EAE', level: 3, weight: 5.01 },
  { systemName: 'casualty_area_manager', name: 'Encargado del Área de Concentración de Víctimas', abbreviation: 'EACV', level: 3, weight: 5.02 },
  { systemName: 'air_operations_branch_director', name: 'Coordinador de la Rama de Operaciones Aéreas', abbreviation: 'CROA', level: 3, weight: 5.03 },
  { systemName: 'branch_director', name: 'Coordinador de Rama', abbreviation: 'CR', level: 3, weight: 5.1, aliases: ['Director de Rama'] },
  { systemName: 'division_supervisor', name: 'Supervisor de División', abbreviation: 'SD', level: 3, weight: 5.2 },
  { systemName: 'group_supervisor', name: 'Supervisor de Grupo', abbreviation: 'SG', level: 3, weight: 5.3 },

  // ===== Nivel 3: Sección de Planificación =====
  { systemName: 'situation_unit_leader', name: 'Líder de la Unidad de Situación', abbreviation: 'LUSIT', level: 3, weight: 6.1, aliases: ['Líder de Unidad de Situación'] },
  { systemName: 'resources_unit_leader', name: 'Líder de la Unidad de Recursos', abbreviation: 'LUREC', level: 3, weight: 6.2, aliases: ['Líder de Unidad de Recursos'] },
  { systemName: 'documentation_unit_leader', name: 'Líder de la Unidad de Documentación', abbreviation: 'LUDOC', level: 3, weight: 6.3, aliases: ['Líder de Unidad de Documentación'] },
  { systemName: 'demobilization_unit_leader', name: 'Líder de la Unidad de Desmovilización', abbreviation: 'LUDES', level: 3, weight: 6.4, aliases: ['Líder de Unidad de Desmovilización'] },
  { systemName: 'technical_specialist', name: 'Técnico Especialista', abbreviation: 'TESP', level: 3, weight: 6.5, aliases: ['Especialista Técnico'] },

  // ===== Nivel 3: Sección de Logística =====
  { systemName: 'service_branch_director', name: 'Coordinador de la Rama de Servicios', abbreviation: 'CRS', level: 3, weight: 7.1, aliases: ['Director de Rama de Servicios', 'Jefe de Rama de Servicios'] },
  { systemName: 'support_branch_director', name: 'Coordinador de la Rama de Apoyo', abbreviation: 'CRAP', level: 3, weight: 7.2, aliases: ['Director de Rama de Apoyo', 'Jefe de Rama de Apoyo'] },

  // ===== Nivel 3: Sección de Administración y Finanzas =====
  { systemName: 'time_unit_leader', name: 'Líder de la Unidad de Tiempos', abbreviation: 'LUT', level: 3, weight: 8.1, aliases: ['Líder de Unidad de Tiempo'] },
  { systemName: 'procurement_unit_leader', name: 'Líder de la Unidad de Proveeduría', abbreviation: 'LUP', level: 3, weight: 8.2, aliases: ['Líder de Unidad de Compras'] },
  // El manual no le asigna sigla a esta unidad (Anexo A); "LUCR" es propia del sistema.
  { systemName: 'compensation_claims_unit_leader', name: 'Líder de la Unidad de Compensaciones y Reclamos', abbreviation: 'LUCR', level: 3, weight: 8.3, aliases: ['Líder de Unidad de Compensaciones', 'Líder de Compensaciones y Reclamaciones'] },
  { systemName: 'cost_unit_leader', name: 'Líder de la Unidad de Costos', abbreviation: 'LUCO', level: 3, weight: 8.4, aliases: ['Líder de Unidad de Costos'] },

  // ===== Nivel 4: Operaciones (apoyo aéreo y líderes de recursos) =====
  { systemName: 'air_support_supervisor', name: 'Supervisor de Apoyo Aéreo', abbreviation: 'SAA', level: 4, weight: 5.03 },
  { systemName: 'helibase_manager', name: 'Encargado de Helibase', abbreviation: 'EH', level: 4, weight: 5.04 },
  { systemName: 'helispot_manager', name: 'Encargado de Helipunto', abbreviation: 'EHP', level: 4, weight: 5.05 },
  { systemName: 'task_force_leader', name: 'Líder de Fuerza de Tarea', abbreviation: 'LFT', level: 4, weight: 5.2 },
  { systemName: 'intervention_team_leader', name: 'Líder de Equipo de Intervención', abbreviation: 'LEI', level: 4, weight: 5.3 },

  // ===== Nivel 4: Planificación =====
  { systemName: 'resources_recorder', name: 'Registrador de Recursos', abbreviation: 'REG', level: 4, weight: 6.2 },

  // ===== Nivel 4: Unidades de Logística =====
  { systemName: 'communications_unit_leader', name: 'Líder de la Unidad de Comunicaciones', abbreviation: 'LUCOM', level: 4, weight: 7.11, aliases: ['Líder de Unidad de Comunicaciones', 'Unidad de Comunicaciones'] },
  { systemName: 'medical_unit_leader', name: 'Líder de la Unidad Médica', abbreviation: 'LUMED', level: 4, weight: 7.12, aliases: ['Líder de Unidad Médica', 'Unidad Médica'] },
  { systemName: 'food_unit_leader', name: 'Líder de la Unidad de Alimentación', abbreviation: 'LUAL', level: 4, weight: 7.13, aliases: ['Líder de Unidad de Alimentación', 'Unidad de Alimentación'] },
  { systemName: 'supply_unit_leader', name: 'Líder de la Unidad de Suministros', abbreviation: 'LUSUM', level: 4, weight: 7.21, aliases: ['Líder de Unidad de Suministros'] },
  { systemName: 'facilities_unit_leader', name: 'Líder de la Unidad de Instalaciones', abbreviation: 'LUINS', level: 4, weight: 7.22, aliases: ['Líder de Unidad de Instalaciones'] },
  { systemName: 'ground_support_unit_leader', name: 'Líder de la Unidad de Apoyo Terrestre', abbreviation: 'LUAT', level: 4, weight: 7.23, aliases: ['Líder de Unidad de Transporte', 'Unidad de Transporte'] },

  // ===== Nivel 5: Personal de los recursos y de las unidades =====
  { systemName: 'task_force_member', name: 'Integrante de Fuerza de Tarea', abbreviation: 'FT', level: 5, weight: 5.2, aliases: ['Fuerza de Tarea'] },
  { systemName: 'intervention_team_member', name: 'Integrante de Equipo de Intervención', abbreviation: 'EI', level: 5, weight: 5.3, aliases: ['Equipo de Ataque'], legacySystemNames: ['attack_team'] },
  { systemName: 'single_resource', name: 'Recurso Simple', abbreviation: 'RS', level: 5, weight: 5.4 },
  { systemName: 'radio_operator', name: 'Radioperador', abbreviation: 'RADOP', level: 5, weight: 7.11 },
  { systemName: 'ambulance_operator', name: 'Operador de Ambulancia', abbreviation: 'OAMB', level: 5, weight: 7.12 },
];

/**
 * Entradas del catálogo anterior que no son cargos del SCI sino profesiones u oficios. Se
 * retiran (borrado lógico): las asignaciones históricas conservan el nombre, pero ya no se
 * pueden elegir. Esas personas se asignan como integrantes de un equipo o recurso simple.
 */
export const RETIRED_CHARGE_NAMES: readonly string[] = [
  'Rescatista',
  'Paramédico',
  'Bombero / Combatiente',
  'Voluntario de Apoyo',
];

/** Clave por defecto al asignar personal en la web. */
export const DEFAULT_PERSONNEL_CHARGE = 'intervention_team_member';
