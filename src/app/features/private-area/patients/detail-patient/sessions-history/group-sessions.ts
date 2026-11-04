import { Session, Treatment, TreatmentWithSessions } from '../../models/patients.model';

const newestFirst = (a: Date | string, b: Date | string) =>
  new Date(b).getTime() - new Date(a).getTime();

/**
 * Qué tratamientos enseña el historial de sesiones y con qué sesiones.
 *
 * - Si hay tratamientos activos, todos ellos.
 * - Si no, solo el último que empezó (para que el historial no quede vacío).
 * - Las sesiones de cada tratamiento, de la más reciente a la más antigua.
 * - Las sesiones sin tratamiento no aparecen aquí.
 */
export function groupSessionsByTreatment(
  treatments: Treatment[],
  sessions: Session[],
): TreatmentWithSessions[] {
  const active = treatments.filter((t) => t.status === 'active');
  const latest = [...treatments].sort((a, b) => newestFirst(a.start_date, b.start_date))[0];
  const selected = active.length > 0 ? active : latest ? [latest] : [];

  return selected.map((treatment) => ({
    treatment,
    sessions: sessions
      .filter((s) => s.treatment_id === treatment.id)
      .sort((a, b) => newestFirst(a.session_date, b.session_date)),
  }));
}

/** "3 de 10 sesiones"; sin sesiones planificadas, "3 de ∞ sesiones". */
export function sessionsCountLabel(done: number, planned?: number): string {
  return `${done} de ${planned || '∞'} sesiones`;
}
