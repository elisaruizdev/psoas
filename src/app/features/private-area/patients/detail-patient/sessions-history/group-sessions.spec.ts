import { aSession, aTreatment } from '../../../../../../testing/fixtures';
import { groupSessionsByTreatment, sessionsCountLabel } from './group-sessions';

describe('sessionsCountLabel', () => {
  it('cuenta las sesiones hechas frente a las planificadas', () => {
    expect(sessionsCountLabel(3, 10)).toBe('3 de 10 sesiones');
  });

  it('sin sesiones planificadas, el límite es ∞', () => {
    expect(sessionsCountLabel(0, undefined)).toBe('0 de ∞ sesiones');
    expect(sessionsCountLabel(2, 0)).toBe('2 de ∞ sesiones');
  });
});

describe('groupSessionsByTreatment', () => {
  it('con tratamientos activos, enseña todos los activos y ninguno de los demás', () => {
    const lumbar = aTreatment({ id: 't-1', status: 'active' });
    const hombro = aTreatment({ id: 't-2', status: 'active' });
    const antiguo = aTreatment({ id: 't-3', status: 'completed' });

    const grupos = groupSessionsByTreatment([lumbar, antiguo, hombro], []);

    expect(grupos.map((g) => g.treatment.id)).toEqual(['t-1', 't-2']);
  });

  it('sin activos, enseña solo el último que empezó', () => {
    const viejo = aTreatment({ id: 't-1', status: 'completed', start_date: '2025-01-10' });
    const reciente = aTreatment({ id: 't-2', status: 'paused', start_date: '2026-03-01' });

    const grupos = groupSessionsByTreatment([viejo, reciente], []);

    expect(grupos.map((g) => g.treatment.id)).toEqual(['t-2']);
  });

  it('sin tratamientos no hay grupos', () => {
    expect(groupSessionsByTreatment([], [aSession()])).toEqual([]);
  });

  it('cada grupo lleva sus sesiones, de la más reciente a la más antigua', () => {
    const lumbar = aTreatment({ id: 't-1' });
    const primera = aSession({ id: 's-1', treatment_id: 't-1', session_date: '2026-10-05' });
    const segunda = aSession({ id: 's-2', treatment_id: 't-1', session_date: '2026-10-12' });
    const deOtro = aSession({ id: 's-3', treatment_id: 't-9' });
    const sinTratamiento = aSession({ id: 's-4', treatment_id: undefined });

    const [grupo] = groupSessionsByTreatment([lumbar], [primera, deOtro, segunda, sinTratamiento]);

    expect(grupo.sessions.map((s) => s.id)).toEqual(['s-2', 's-1']);
  });

  it('no cambia el orden de los arrays que recibe', () => {
    const tratamientos = [
      aTreatment({ id: 't-1', status: 'completed', start_date: '2025-01-10' }),
      aTreatment({ id: 't-2', status: 'completed', start_date: '2026-03-01' }),
    ];
    groupSessionsByTreatment(tratamientos, []);
    expect(tratamientos.map((t) => t.id)).toEqual(['t-1', 't-2']);
  });
});
