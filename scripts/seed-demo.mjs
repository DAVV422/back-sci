// Datos de demostración para la base de DESARROLLO, cargados por la API para que pasen por las
// mismas validaciones que la app: personal, inventario con vehículos y 7 emergencias en distintos
// estados (activas completas, traspaso de mando, muchas víctimas, pendientes, finalizada, cancelada).
//
// Uso (con el backend corriendo):
//   npm run seed:demo -- --user=tu@correo.com [--wait]
//   --user  usuario que queda como Comandante del Incidente (debe existir; misma contraseña que ADMIN_PASSWORD).
//           Sin --user se usa ADMIN_EMAIL.
//   --wait  espera 65 s antes de empezar (el login admite 5 intentos por minuto).
// Lee credenciales del .env y nunca las imprime. El personal demo usa correos @demo.sci.test (dominio
// inexistente) con la contraseña ADMIN_PASSWORD y se crea activo: no se envían correos de activación.
// Idempotente: lo que ya existe (por correo, nombre o código) no se duplica. No usar en producción.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const env = {};
for (const line of readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const API = process.env.SEED_API_URL ?? `http://localhost:${env.PORT || 3000}/api`;
const PASSWORD = env.ADMIN_PASSWORD;
const ME = process.argv.find(a => a.startsWith('--user='))?.slice(7) || env.ADMIN_EMAIL;
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) throw new Error('Faltan ADMIN_EMAIL / ADMIN_PASSWORD en el .env.');

const pause = ms => new Promise(r => setTimeout(r, ms));
// Bajo el límite global de la API (300 peticiones por minuto).
async function api(path, { token, method = 'GET', body } = {}) {
  await pause(230);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json.message ?? json).slice(0, 300)}`);
  return json.data;
}
const login = async (email, password = PASSWORD) => (await api('/login', { method: 'POST', body: { email, password } })).accessToken;
const step = msg => console.log(`  · ${msg}`);

// Hora local de Bolivia (UTC-4) → fecha y hora UTC, como las envía la app.
function utc(day, hhmm) {
  const d = new Date(`${day}T${hhmm}:00-04:00`);
  return { date: d.toISOString().slice(0, 10), hour: d.toISOString().slice(11, 16), iso: d.toISOString() };
}

// ---------------------------------------------------------------- sesiones
if (process.argv.includes('--wait')) { console.log('Esperando la ventana de inicio de sesión (65 s)...'); await pause(65000); }
const admin = await login(env.ADMIN_EMAIL);
const me = await login(ME);
const meProfile = await api('/user/me', { token: me });
console.log(`Usuario principal: ${meProfile.name} ${meProfile.lastName} (rol ${meProfile.role})`);

// ---------------------------------------------------------------- personal
console.log('Personal de demostración');
const PEOPLE = [
  ['rlopez', 'Roberto', 'López Vargas', 'manager', 'Capitán'],
  ['aflores', 'Ana', 'Flores Suárez', 'basic', 'Teniente'],
  ['jmendoza', 'Jorge', 'Mendoza Rojas', 'basic', 'Sargento'],
  ['lquispe', 'Lucía', 'Quispe Mamani', 'basic', 'Paramédico'],
  ['cguzman', 'Carlos', 'Guzmán Paz', 'basic', 'Bombero'],
  ['vrocha', 'Valeria', 'Rocha Aguilar', 'basic', 'Bombera'],
  ['mtorrez', 'Miguel', 'Torrez Cruz', 'basic', 'Cabo'],
  ['psalazar', 'Patricia', 'Salazar Ibáñez', 'basic', 'Médica'],
];
const directory = await api('/user/admin/all?limit=200', { token: admin }).catch(() => null);
const existing = new Map();
for (const u of (Array.isArray(directory) ? directory : directory?.items ?? directory?.data ?? [])) existing.set(u.email, u);
const users = {};
for (const [key, name, lastName, role, grade] of PEOPLE) {
  const email = `${key}@demo.sci.test`;
  let user = existing.get(email);
  if (!user) {
    try {
      // `mustChangePassword: false` a propósito: estas cuentas existen para mostrar el sistema con
      // una contraseña compartida y conocida. Con el cambio obligatorio encendido, la demostración
      // quedaría inservible.
      user = await api('/user', { method: 'POST', token: admin, body: { name, lastName, email, password: PASSWORD, role, grade, isActive: true, isOperational: true, mustChangePassword: false, cellphone: `7${Math.floor(1000000 + Math.random() * 8999999)}` } });
      step(`creado ${name} ${lastName}`);
    } catch (e) {
      if (!/existe/i.test(e.message)) throw e;
      user = (await api(`/user/directory?search=${encodeURIComponent(name)}`, { token: admin })).find?.(u => u.email === email);
      if (!user) throw e;
    }
  }
  users[key] = { ...user, email };
}
users.me = meProfile;

// ---------------------------------------------------------------- cargos
const charges = await api('/charge', { token: admin });
const charge = sys => {
  const c = charges.find(x => x.systemName === sys);
  if (!c) throw new Error(`Cargo ${sys} no existe. Disponibles: ${charges.map(x => x.systemName).filter(Boolean).join(', ')}`);
  return c.id;
};

// ---------------------------------------------------------------- inventario
console.log('Inventario');
const EQUIPMENT = [
  ['Motobomba portátil', 'Caudal 400 L/min', 6, 'extincion', false, ['Incendio', 'Incendio forestal', 'Inundación']],
  ['Manguera 1½" (tramo 15 m)', 'Con acoples Storz', 40, 'extincion', false, ['Incendio', 'Incendio forestal']],
  ['Extintor PQS 10 kg', null, 25, 'extincion', false, ['Incendio']],
  ['Batefuego', 'Herramienta de combate forestal', 30, 'extincion', false, ['Incendio forestal']],
  ['Equipo de corte hidráulico', 'Separador y cizalla', 3, 'rescate', false, ['Accidente Vehicular', 'Derrumbe', 'Rescate']],
  ['Camilla rígida con inmovilizador', null, 12, 'aph', false, ['Accidente Vehicular', 'Emergencia Médica', 'Derrumbe']],
  ['Botiquín de trauma', null, 15, 'aph', true, []],
  ['Radio portátil VHF', 'Canales 1-16', 30, 'comunicaciones', true, []],
  ['Casco estructural', null, 40, 'epp', true, []],
  ['Equipo de respiración autónoma (ERA)', 'Cilindro 30 min', 10, 'epp', false, ['Incendio', 'Materiales Peligrosos']],
  ['Detector multigás', 'O2, LEL, CO, H2S', 4, 'matpel', false, ['Materiales Peligrosos', 'Incendio']],
  ['Generador eléctrico 5 kVA', null, 3, 'logistica', true, []],
];
const equipmentList = await api('/equipment', { token: admin });
const eq = {};
for (const [name, description, total, category, generalUse, emergencyTypes] of EQUIPMENT) {
  let item = equipmentList.find(e => e.name === name);
  if (!item) {
    item = await api('/equipment', { method: 'POST', token: admin, body: { name, ...(description ? { description } : {}), totalQuantity: total, availableQuantity: total, category, generalUse, emergencyTypes } });
    step(`equipo ${name}`);
  }
  eq[name] = item;
}
const VEHICLES = [
  ['BX-01', 'Autobomba', '2045-KLM', [['Motobomba portátil', 1], ['Manguera 1½" (tramo 15 m)', 8], ['Extintor PQS 10 kg', 2], ['Casco estructural', 6], ['Equipo de respiración autónoma (ERA)', 4], ['Radio portátil VHF', 4]]],
  ['UR-02', 'Unidad de rescate', '3310-PTR', [['Equipo de corte hidráulico', 1], ['Camilla rígida con inmovilizador', 2], ['Botiquín de trauma', 2], ['Radio portátil VHF', 2]]],
  ['AMB-03', 'Ambulancia', '1987-SDF', [['Camilla rígida con inmovilizador', 1], ['Botiquín de trauma', 2]]],
  ['FOR-04', 'Unidad forestal', '4521-GHJ', [['Batefuego', 10], ['Motobomba portátil', 1], ['Radio portátil VHF', 3]]],
];
const vehicles = {};
const vehicleList = await api('/vehicle', { token: admin });
for (const [code, vehicleType, plate, load] of VEHICLES) {
  let v = vehicleList.find(x => x.code === code);
  if (!v) {
    v = await api('/vehicle', { method: 'POST', token: admin, body: { code, vehicleType, plate, load: load.map(([n, quantity]) => ({ equipmentId: eq[n].id, quantity })) } });
    step(`vehículo ${code}`);
  }
  vehicles[code] = { ...v, load };
}

// ---------------------------------------------------------------- utilidades de escenario
const tokens = { me };
const tokenOf = async key => (tokens[key] ??= await login(users[key].email));
const allEmergencies = await api('/emergency?limit=200', { token: admin }).catch(() => []);
const emergencyNames = new Set((Array.isArray(allEmergencies) ? allEmergencies : allEmergencies.items ?? allEmergencies.data ?? []).map(e => e.name));

async function assign(t, emergencyId, day, hhmm, userKey, chargeSys) {
  const when = utc(day, hhmm);
  await api('/attend', { method: 'POST', token: t, body: { date: when.date, hour: when.hour, user: users[userKey].id, emergency: emergencyId, charge: charge(chargeSys) } });
}
async function log(t, emergencyId, day, hhmm, description) {
  const when = utc(day, hhmm);
  await api('/action', { method: 'POST', token: t, body: { description, date: when.date, hour: when.hour, emergency: emergencyId } });
}
async function victims(t, emergencyId, place, day, list) {
  const f207 = await api(`/emergency/${emergencyId}/form207`, { method: 'POST', token: t, body: { placeOfRegistration: place, date: day } });
  for (const v of list) {
    const victim = await api('/victim', { method: 'POST', token: t, body: v.victim });
    for (const r of v.triage) {
      await api(`/form207/${f207.id}/registration`, { method: 'POST', token: t, body: { victimId: victim.id, ...r } });
    }
  }
  return f207;
}
async function dispatchVehicle(t, emergencyId, code, note) {
  const v = vehicles[code];
  await api(`/emergency/${emergencyId}/vehicle`, { method: 'POST', token: t, body: { vehicleId: v.id, items: v.load.map(([n, amount]) => ({ equipmentId: eq[n].id, amount })), note } });
}
async function dispatch(t, emergencyId, name, amount, note) {
  await api('/resource', { method: 'POST', token: t, body: { equipmentId: eq[name].id, amount, emergencyId, ...(note ? { note } : {}) } });
}
async function createEmergency(t, body, when) {
  if (emergencyNames.has(body.name)) { console.log(`= ${body.name} (ya existe, se omite)`); return null; }
  console.log(`+ ${body.name}`);
  const w = utc(...when);
  return api('/emergency', { method: 'POST', token: t, body: { ...body, date: w.date, hour: w.hour } });
}
// Coordenadas del backend: [lng, lat] (GeoJSON).
const pt = (lat, lng) => [lng, lat];
const offset = (lat, lng) => (dLat, dLng) => ({ lat: +(lat + dLat).toFixed(6), lng: +(lng + dLng).toFixed(6) });

const briefing = ['incident_status', 'safety', 'objectives', 'organization', 'resource_assignment', 'resources_en_route', 'facilities', 'communications', 'probable_evolution', 'in_person'];

// ================================================================ 1. Incendio estructural (activa, completa)
{
  const [lat, lng] = [-17.7962, -63.1812]; // Mercado Los Pozos
  const at = offset(lat, lng);
  const e = await createEmergency(me, {
    name: 'Incendio estructural en mercado Los Pozos', type: 'Incendio',
    location_description: 'Mercado Los Pozos, pabellón de abarrotes, calle Campero y 6 de Agosto',
    coordinates: pt(lat, lng), coordinates_pc: pt(at(-0.0016, -0.0021).lat, at(-0.0016, -0.0021).lng), coordinates_e: pt(at(-0.0028, 0.0012).lat, at(-0.0028, 0.0012).lng)
  }, ['2026-10-26', '09:40']);
  if (e) {
    const day = '2026-10-26';
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: me, body: { state: 'a' } });
    await api(`/emergency/${e.id}/assessment`, { method: 'POST', token: me, body: {
      hazard_type: 'Incendio estructural con carga combustible alta', nature_of_incident: 'Incendio en pabellón comercial',
      threats: 'Colapso de techumbre, propagación a pabellones vecinos, humo tóxico, cilindros de GLP',
      affected_area: 'Pabellón de abarrotes, ~1.200 m²', isolation: 'Perímetro de 150 m; calle Campero cerrada',
      severity_level: 'Alto', affected_people_estimated: 35, weather_conditions: 'Viento norte 20 km/h, 31 °C',
      situation_description: 'Fuego declarado en el sector central del pabellón. Comerciantes evacuados por los accesos sur. Se reportan dos personas con inhalación de humo y una con quemaduras.'
    } });
    step('evaluación inicial');
    for (const [u, c, h] of [['aflores', 'operations_chief', '09:52'], ['jmendoza', 'safety_officer', '09:55'], ['lquispe', 'medical_unit_leader', '10:00'], ['cguzman', 'intervention_team_member', '10:02'], ['vrocha', 'intervention_team_member', '10:02'], ['mtorrez', 'staging_area_manager', '10:05']]) {
      await assign(me, e.id, day, h, u, c);
    }
    step('organigrama (6 personas)');
    const p = utc(day, '10:10');
    const f = await api(`/emergency/${e.id}/form201`, { method: 'POST', token: me, body: {
      date: p.date, preparedAt: p.iso,
      nature: 'Incendio estructural en mercado', thread: 'Propagación a pabellones vecinos y colapso de techumbre',
      affectedArea: 'Pabellón de abarrotes y pasillo central', communicationsChannel: 'Canal 3 táctico / Canal 1 comando',
      entryRoute: 'Por Av. Grigotá, ingreso por calle Campero', egressRoute: 'Por calle 6 de Agosto hacia el 2º anillo',
      objectives: 'Confinar el fuego al pabellón de abarrotes\nEvacuar y contar a todos los comerciantes\nProteger los cilindros de GLP del sector norte',
      strategies: 'Ataque ofensivo interior por el acceso sur con dos líneas de 1½"; línea de protección en el pabellón norte.',
      tactics: 'BX-01 alimenta dos líneas; cuadrilla de ventilación en techumbre; retiro de cilindros de GLP.',
      safetyMessage: 'Nadie ingresa sin ERA. Vigilar señales de colapso de la techumbre; salida de emergencia por el acceso sur.',
      situationMap: {
        perimeter: [at(0.0013, -0.0015), at(0.0013, 0.0016), at(-0.0012, 0.0016), at(-0.0012, -0.0015)],
        elements: [
          { id: 'pc', symbol: 'command_post', ...at(-0.0016, -0.0021), label: 'PC' },
          { id: 'e1', symbol: 'staging_area', ...at(-0.0028, 0.0012), label: 'Espera Campero' },
          { id: 'acv', symbol: 'casualty_area', ...at(-0.0019, 0.0006), label: 'ACV' },
          { id: 'o', symbol: 'incident_origin', ...at(0.0001, 0.0001) },
          { id: 'h1', symbol: 'hazard', ...at(0.0009, 0.0011), label: 'Cilindros GLP' },
          { id: 'w', symbol: 'water_source', ...at(-0.0022, -0.0009), label: 'Hidrante' },
        ]
      },
      affectedAreasMap: {
        frame: { north: lat + 0.0045, south: lat - 0.0045, east: lng + 0.0060, west: lng - 0.0060 },
        zones: [
          { id: 'z1', label: 'Pabellón abarrotes', points: [at(0.0007, -0.0009), at(0.0007, 0.0008), at(-0.0006, 0.0008), at(-0.0006, -0.0009)] },
          { id: 'z2', label: 'Zona de humo', points: [at(0.0008, 0.0009), at(0.0024, 0.0019), at(0.0021, 0.0031), at(0.0004, 0.0016)] },
        ],
        entryRoute: [at(-0.0040, -0.0052), at(-0.0030, -0.0035), at(-0.0019, -0.0024), at(-0.0013, -0.0012)],
        egressRoute: [at(-0.0010, 0.0010), at(-0.0022, 0.0024), at(-0.0036, 0.0042)]
      }
    } });
    step(`Formulario 201 ${f.code} con mapa de situación, recorte y rutas`);
    await dispatchVehicle(me, e.id, 'BX-01', 'Ataque por acceso sur');
    await dispatchVehicle(me, e.id, 'AMB-03', 'En el ACV');
    await dispatch(me, e.id, 'Generador eléctrico 5 kVA', 1, 'Iluminación del PC');
    await dispatch(me, e.id, 'Detector multigás', 1);
    step('recursos: 2 vehículos y equipo suelto');
    await victims(me, e.id, 'Área de Concentración de Víctimas (ACV)', day, [
      { victim: { identifier: 'Juana Mamani', ageEstimated: 52, gender: 'Femenino', cellphone: '71234567' },
        triage: [{ classification: 'amarillo', notes: 'Inhalación de humo, saturación 91%' }, { classification: 'amarillo', transferDestination: 'Hospital Japonés', transportMeans: 'ambulancia', transferredBy: 'AMB-03', notes: 'Mejora con oxígeno' }] },
      { victim: { identifier: 'NN-001', ageEstimated: 35, gender: 'Masculino' },
        triage: [{ classification: 'rojo', transferDestination: 'Hospital San Juan de Dios', transportMeans: 'ambulancia', transferredBy: 'SAMU 12', notes: 'Quemaduras de 2º grado en brazos y tórax (~18%)' }] },
      { victim: { identifier: 'Pedro Rojas', ageEstimated: 28, gender: 'Masculino', referenceCellphone: '76543210' },
        triage: [{ classification: 'verde', notes: 'Corte superficial en mano, atendido en sitio' }] },
    ]);
    step('Formulario 207 con 3 víctimas');
    for (const [h, d] of [
      ['09:48', 'Primera unidad en escena: fuego declarado en pabellón de abarrotes'],
      ['09:58', 'Se establece el PC en calle Campero; perímetro de 150 m'],
      ['10:15', 'Evacuación del pabellón completa; 3 personas al ACV'],
      ['10:32', 'Retirados 6 cilindros de GLP del sector norte'],
      ['10:50', 'Fuego confinado al pabellón; se mantiene ataque interior'],
    ]) await log(me, e.id, day, h, d);
    step('bitácora (5 novedades)');
  }
}

// ================================================================ 2. Incendio forestal con traspaso de mando (activa)
{
  const [lat, lng] = [-17.6905, -63.1555]; // Lomas de Arena
  const at = offset(lat, lng);
  const ana = await tokenOf('aflores');
  const e = await createEmergency(ana, {
    name: 'Incendio forestal en Parque Lomas de Arena', type: 'Incendio forestal',
    location_description: 'Parque Regional Lomas de Arena, sector de dunas norte, acceso por carretera a Palmasola',
    coordinates: pt(lat, lng), coordinates_pc: pt(at(-0.0060, -0.0040).lat, at(-0.0060, -0.0040).lng)
  }, ['2026-10-25', '13:20']);
  if (e) {
    const day = '2026-10-25';
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: ana, body: { state: 'a' } });
    await api(`/emergency/${e.id}/assessment`, { method: 'POST', token: ana, body: {
      hazard_type: 'Incendio de vegetación', nature_of_incident: 'Incendio forestal en interfaz', threats: 'Propagación hacia viviendas de la comunidad El Palmar',
      affected_area: '~45 ha de pastizal y monte bajo', isolation: 'Cierre del camino vecinal al parque', severity_level: 'Extremo',
      affected_people_estimated: 120, weather_conditions: 'Viento sur 35 km/h, humedad 18%, 36 °C',
      situation_description: 'Frente activo de 1,5 km avanzando hacia el norte. Comunidad El Palmar en riesgo.'
    } });
    for (const [u, c, h] of [['me', 'operations_chief', '13:40'], ['cguzman', 'intervention_team_member', '13:45'], ['vrocha', 'intervention_team_member', '13:45'], ['jmendoza', 'safety_officer', '13:50']]) {
      await assign(ana, e.id, day, h, u, c);
    }
    const p = utc(day, '13:55');
    const f1 = await api(`/emergency/${e.id}/form201`, { method: 'POST', token: ana, body: {
      date: p.date, preparedAt: p.iso, nature: 'Incendio forestal', thread: 'Avance del frente hacia El Palmar',
      affectedArea: 'Dunas norte y pastizal', communicationsChannel: 'Canal 5 forestal', entryRoute: 'Carretera a Palmasola, desvío km 8',
      egressRoute: 'Mismo camino hacia la carretera', objectives: 'Proteger viviendas de El Palmar\nAbrir cortafuego en el límite norte',
      strategies: 'Ataque indirecto con cortafuego y quema de ensanche', tactics: 'Dos cuadrillas con batefuegos; FOR-04 en línea de defensa',
      safetyMessage: 'Rutas de escape siempre a zona negra; vigilar cambios de viento.',
      affectedAreasMap: {
        frame: { north: lat + 0.012, south: lat - 0.010, east: lng + 0.014, west: lng - 0.014 },
        zones: [{ id: 'quemado', label: 'Área quemada', points: [at(-0.004, -0.006), at(0.002, -0.008), at(0.006, -0.002), at(0.004, 0.005), at(-0.003, 0.004)] }],
        entryRoute: [at(-0.0095, -0.012), at(-0.0075, -0.007), at(-0.006, -0.004)],
        egressRoute: [at(-0.006, -0.004), at(-0.0085, -0.0005), at(-0.0098, 0.006)]
      }
    } });
    await dispatchVehicle(ana, e.id, 'FOR-04', 'Línea de defensa norte');
    await dispatch(ana, e.id, 'Batefuego', 12);
    await log(ana, e.id, day, '13:35', 'Arribo de la primera unidad; frente activo de 1,5 km');
    await log(ana, e.id, day, '14:10', 'Solicitado apoyo de la Gobernación con cisterna');
    // Cambio de periodo: Ana entrega el mando a Diego. El 201 del periodo se cierra.
    await api(`/form201/${f1.id}/finalize`, { method: 'PATCH', token: ana, body: {} });
    await api(`/emergency/${e.id}/attend/transfer-command`, { method: 'POST', token: ana, body: {
      newCommanderUserId: users.me.id, briefing, notes: 'Entrega al cambio de turno; Ana pasa a Operaciones.'
    } });
    step('201 del primer mando finalizado y traspaso de mando a tu usuario');
    await log(me, e.id, day, '18:15', 'Asume el mando el nuevo CI; frente norte contenido en un 60%');
    const p2 = utc(day, '18:30');
    await api(`/emergency/${e.id}/form201`, { method: 'POST', token: me, body: {
      date: p2.date, preparedAt: p2.iso, nature: 'Incendio forestal', thread: 'Reactivación nocturna por viento',
      objectives: 'Consolidar el cortafuego norte\nLiquidación del perímetro este'
    } });
    step('201 del nuevo mando, incompleto (para probar lo que falta al finalizar)');
  }
}

// ================================================================ 3. Accidente vehicular múltiple (activa, muchas víctimas)
{
  const [lat, lng] = [-17.6830, -63.1625];
  const at = offset(lat, lng);
  const NAME = 'Accidente múltiple en carretera al Norte km 12';
  const list = await api('/emergency?limit=200', { token: me });
  const partial = (Array.isArray(list) ? list : list.items ?? []).find(x => x.name === NAME);
  const day = '2026-10-26';
  let e = null;
  if (!partial) {
    e = await createEmergency(me, { name: NAME, type: 'Accidente Vehicular',
      location_description: 'Carretera al Norte, km 12, frente a la estación de servicio', coordinates: pt(lat, lng) }, ['2026-10-26', '07:15']);
  }
  if (e) {
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: me, body: { state: 'a' } });
    await api(`/emergency/${e.id}/assessment`, { method: 'POST', token: me, body: {
      hazard_type: 'Colisión múltiple con derrame de combustible', severity_level: 'Alto', affected_people_estimated: 9,
      threats: 'Derrame de diésel, tránsito en ambos carriles',
      situation_description: 'Colisión entre un bus interprovincial y dos vehículos livianos. Personas atrapadas en un vehículo.'
    } });
    for (const [u, c, h] of [['psalazar', 'medical_unit_leader', '07:25'], ['lquispe', 'casualty_area_manager', '07:27'], ['mtorrez', 'intervention_team_member', '07:30']]) {
      await assign(me, e.id, day, h, u, c);
    }
    await dispatchVehicle(me, e.id, 'UR-02', 'Extricación del vehículo atrapado');
    await dispatch(me, e.id, 'Camilla rígida con inmovilizador', 4);
  }
  // Se completa también si una corrida anterior la dejó a medias (sin 207).
  const target = e ?? partial;
  const has207 = target && (await api(`/emergency/${target.id}/form207`, { token: me })).length > 0;
  if (target && !has207) {
    if (!e) console.log(`~ ${NAME} (se completa lo que faltó)`);
    e = target;
    const t = me;
    const people = [
      ['NN-101', 45, 'Masculino', [{ classification: 'rojo', notes: 'Atrapado, trauma de tórax' }, { classification: 'rojo', transferDestination: 'Hospital de Clínicas', transportMeans: 'ambulancia', transferredBy: 'SAMU 7', notes: 'Extricado a las 07:50' }]],
      ['María Choque', 32, 'Femenino', [{ classification: 'amarillo', transferDestination: 'Hospital Japonés', transportMeans: 'ambulancia', transferredBy: 'AMB Cruz Roja' , notes: 'Fractura de antebrazo' }]],
      ['NN-102', 60, 'Masculino', [{ classification: 'negro', notes: 'Sin signos vitales al arribo' }]],
      ['Luis Paz', 19, 'Masculino', [{ classification: 'verde', notes: 'Contusiones leves' }]],
      ['Rosa Vaca', 41, 'Femenino', [{ classification: 'amarillo', notes: 'TEC leve, consciente' }, { classification: 'rojo', transferDestination: 'Hospital San Juan de Dios', transportMeans: 'ambulancia', transferredBy: 'SAMU 3', notes: 'Deterioro neurológico' }]],
      ['NN-103', 8, 'Femenino', [{ classification: 'verde', notes: 'Acompañada por su madre (Rosa Vaca)' }]],
      ['Jaime Arteaga', 55, 'Masculino', [{ classification: 'verde', notes: 'Crisis nerviosa' }]],
    ];
    await victims(t, e.id, 'Área de Concentración de Víctimas (ACV)', day, people.map(([identifier, ageEstimated, gender, triage]) => ({ victim: { identifier, ageEstimated, gender }, triage })));
    step('Formulario 207 con 7 víctimas (con reevaluaciones)');
    const p = utc(day, '07:40');
    await api(`/emergency/${e.id}/form201`, { method: 'POST', token: me, body: {
      date: p.date, preparedAt: p.iso, nature: 'Accidente de tránsito múltiple', thread: 'Derrame de diésel y tránsito',
      objectives: 'Extricar a la persona atrapada\nTriage y traslado de víctimas\nControlar el derrame'
    } });
    step('201 incompleto');
    for (const [h, d] of [['07:22', 'Arribo: bus y dos vehículos livianos, una persona atrapada'], ['07:50', 'Extricación completada'], ['08:05', 'Tres traslados en curso; vía cerrada en ambos sentidos']]) await log(me, e.id, day, h, d);
  }
}

// ================================================================ 4. Inundación (pendiente, con algo de datos)
{
  const [lat, lng] = [-17.8340, -63.1350];
  const e = await createEmergency(me, {
    name: 'Inundación en barrio Plan 3000', type: 'Inundación',
    location_description: 'Plan 3000, UV 160, canal de drenaje desbordado', coordinates: pt(lat, lng)
  }, ['2026-10-26', '16:05']);
  if (e) {
    await api(`/emergency/${e.id}/assessment`, { method: 'POST', token: me, body: { hazard_type: 'Anegamiento de viviendas', severity_level: 'Medio', affected_people_estimated: 60 } });
    step('pendiente con evaluación parcial');
  }
}

// ================================================================ 5. Registro rápido sin datos (pendiente)
{
  const e = await createEmergency(me, { name: 'Emergencia reportada por radio (sin clasificar)' }, ['2026-10-26', '17:30']);
  if (e) step('pendiente, solo registrada (como cuando se registra en segundos)');
}

// ================================================================ 6. Fuga de gas (finalizada)
{
  const [lat, lng] = [-17.7600, -63.1980];
  const at = offset(lat, lng);
  const e = await createEmergency(me, {
    name: 'Fuga de gas en Av. Cristo Redentor', type: 'Materiales Peligrosos',
    location_description: 'Av. Cristo Redentor entre 3º y 4º anillo, frente a la galería', coordinates: pt(lat, lng)
  }, ['2026-10-24', '11:00']);
  if (e) {
    const day = '2026-10-24';
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: me, body: { state: 'a' } });
    await api(`/emergency/${e.id}/assessment`, { method: 'POST', token: me, body: {
      hazard_type: 'Fuga de gas natural en red de distribución', nature_of_incident: 'Rotura de tubería por excavación', severity_level: 'Medio',
      threats: 'Atmósfera explosiva', isolation: 'Radio de 100 m', affected_people_estimated: 80, weather_conditions: 'Calma, 29 °C',
      situation_description: 'Tubería de 2" rota por maquinaria. YPFB en camino para el corte.'
    } });
    await assign(me, e.id, day, '11:10', 'jmendoza', 'safety_officer');
    await assign(me, e.id, day, '11:12', 'cguzman', 'intervention_team_member');
    await dispatch(me, e.id, 'Detector multigás', 2, 'Monitoreo del perímetro');
    const p = utc(day, '11:20');
    const f = await api(`/emergency/${e.id}/form201`, { method: 'POST', token: me, body: {
      date: p.date, preparedAt: p.iso, nature: 'Fuga de gas', thread: 'Explosión', affectedArea: 'Cuadra frente a la galería',
      communicationsChannel: 'Canal 2', entryRoute: 'Por el 3º anillo', egressRoute: 'Hacia el 4º anillo',
      objectives: 'Evacuar la cuadra\nEliminar fuentes de ignición\nApoyar el corte de YPFB', strategies: 'Aislamiento y monitoreo',
      tactics: 'Monitoreo continuo con multigás; corte de energía del sector', safetyMessage: 'Sin fuentes de ignición en el perímetro.',
      affectedAreasMap: {
        frame: { north: lat + 0.0025, south: lat - 0.0025, east: lng + 0.0035, west: lng - 0.0035 },
        zones: [{ id: 'z', label: 'Radio 100 m', points: [at(0.0009, -0.0009), at(0.0009, 0.0009), at(-0.0009, 0.0009), at(-0.0009, -0.0009)] }],
        entryRoute: [at(-0.0022, -0.0030), at(-0.0010, -0.0012)], egressRoute: [at(0.0010, 0.0012), at(0.0021, 0.0030)]
      }
    } });
    await log(me, e.id, day, '11:15', 'Perímetro de 100 m y evacuación de la cuadra');
    await log(me, e.id, day, '12:40', 'YPFB corta el suministro; lecturas en 0% LEL');
    await api(`/form201/${f.id}/finalize`, { method: 'PATCH', token: me, body: {} });
    const res = await api(`/resource/by-emergency/${e.id}`, { token: me });
    for (const r of res) await api(`/resource/${r.id}/return`, { method: 'PATCH', token: me, body: { amountReturned: r.amount - (r.amount_returned ?? 0) } }).catch(err => step(`devolución: ${err.message}`));
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: me, body: { state: 'f' } });
    step('finalizada con todo completo');
  }
}

// ================================================================ 7. Cancelada
{
  const e = await createEmergency(me, {
    name: 'Rescate de persona en río Piraí', type: 'Rescate', location_description: 'Puente Urubó, margen derecha',
    coordinates: pt(-17.7550, -63.2150)
  }, ['2026-10-23', '18:45']);
  if (e) {
    await api(`/emergency/${e.id}/state`, { method: 'PATCH', token: me, body: { state: 'c', cancellationReason: 'Falsa alarma: la persona salió por sus propios medios antes del arribo.' } });
    step('cancelada con motivo');
  }
}

console.log('\nListo. Usuarios de demostración: *@demo.sci.test (contraseña: la de ADMIN_PASSWORD).');
