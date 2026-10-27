import { UNCLASSIFIED_TYPE, describeCloseBlockers, findCloseBlockers } from './close-requirements';

const complete201 = {
  code: 'F201-001', isDeleted: false, nature: 'n', thread: 't', affectedArea: 'a', objectives: 'o', strategies: 's',
  tactics: 'ta', entryRoute: 'e', egressRoute: 'r', communicationsChannel: 'c', safetyMessage: 'm',
};
const emergency = (extra: Record<string, unknown> = {}) => ({
  type: 'Incendio', location_description: 'Barrio Alto', coordinates: [],
  initialAssessment: { hazard_type: 'Fuego', severity_level: 'Alto', situation_description: 'x' },
  form201: [complete201],
  ...extra,
}) as any;

describe('findCloseBlockers', () => {
  it('con todo completo no hay bloqueos', () => {
    expect(findCloseBlockers(emergency())).toEqual([]);
  });

  it('pide un tipo real y el lugar (descripción o punto)', () => {
    expect(findCloseBlockers(emergency({ type: UNCLASSIFIED_TYPE, location_description: '  ' }))).toEqual([
      { section: 'Datos de la emergencia', tab: 'header', missing: ['Tipo de emergencia', 'Lugar (descripción o punto en el mapa)'] },
    ]);
    expect(findCloseBlockers(emergency({ location_description: null, coordinates: [-68.1, -16.5] }))).toEqual([]);
  });

  it('pide la evaluación inicial y sus datos esenciales', () => {
    expect(findCloseBlockers(emergency({ initialAssessment: null }))[0].missing).toEqual(['Registrar la evaluación inicial']);
    expect(findCloseBlockers(emergency({ initialAssessment: { hazard_type: 'Fuego', severity_level: null, situation_description: '' } }))[0])
      .toEqual({ section: 'Evaluación inicial', tab: 'assessment', missing: ['Nivel de severidad', 'Descripción de la situación'] });
  });

  it('lista, por cada 201, los campos vacíos; sin 201 pide registrarlo', () => {
    const partial = { ...complete201, code: 'F201-002', objectives: '', safetyMessage: null };
    expect(findCloseBlockers(emergency({ form201: [complete201, partial] }))).toEqual([
      { section: 'Formulario 201 F201-002', tab: 'form201', missing: ['Objetivos', 'Mensaje de seguridad'] },
    ]);
    expect(findCloseBlockers(emergency({ form201: [] }))[0].missing).toEqual(['Registrar el Formulario 201']);
  });

  it('las rutas valen escritas o trazadas en el mapa de zonas afectadas', () => {
    const line = [{ lat: -17.4, lng: -66.17 }, { lat: -17.39, lng: -66.16 }];
    const drawn = { ...complete201, entryRoute: null, egressRoute: '', affectedAreasMap: { frame: null, zones: [], entryRoute: line, egressRoute: [] } };
    expect(findCloseBlockers(emergency({ form201: [drawn] }))).toEqual([
      { section: 'Formulario 201 F201-001', tab: 'form201', missing: ['Ruta de egreso (texto o trazado en el mapa)'] },
    ]);
  });

  it('el mensaje del 400 dice sección por sección qué falta', () => {
    expect(describeCloseBlockers(findCloseBlockers(emergency({ type: UNCLASSIFIED_TYPE, form201: [] }))))
      .toBe('Para finalizar la emergencia falta completar: Datos de la emergencia: Tipo de emergencia; Formulario 201: Registrar el Formulario 201.');
  });
});
