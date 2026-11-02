import './psoas-resumen-citas';
import type { CitaResumen, PsoasResumenCitas } from './psoas-resumen-citas';

const citas: CitaResumen[] = [
  { id: 'a-3', hora: '12:00', paciente: 'Mario Sanz', estado: 'confirmed' },
  { id: 'a-1', hora: '09:30', paciente: 'Lucía García', estado: 'scheduled' },
  { id: 'a-2', hora: '10:00', paciente: 'Ana Ruiz', estado: 'completed' },
  { id: 'a-4', hora: '11:00', paciente: 'Luis Gil', estado: 'cancelled' },
];

/** Crea el elemento como lo haría cualquier app y espera a que Lit pinte. */
async function montar(props: Partial<PsoasResumenCitas> = {}): Promise<PsoasResumenCitas> {
  const el = document.createElement('psoas-resumen-citas');
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

const sombra = (el: PsoasResumenCitas) => el.shadowRoot!;

afterEach(() => document.body.replaceChildren());

describe('<psoas-resumen-citas>', () => {
  it('se registra como Custom Element', () => {
    expect(customElements.get('psoas-resumen-citas')).toBeDefined();
  });

  it('usa el título por defecto o el del atributo', async () => {
    const el = await montar();
    expect(sombra(el).querySelector('h2')!.textContent).toBe('Citas de hoy');

    el.setAttribute('titulo', 'Agenda');
    await el.updateComplete;
    expect(sombra(el).querySelector('h2')!.textContent).toBe('Agenda');
  });

  it('muestra solo las pendientes, ordenadas por hora, y cuenta las completadas', async () => {
    const el = await montar({ citas });
    const horas = [...sombra(el).querySelectorAll('.hora')].map((n) => n.textContent);

    expect(horas).toEqual(['09:30', '12:00']);
    expect(sombra(el).querySelector('.cifras')!.textContent).toContain('2 pendientes');
    expect(sombra(el).querySelector('.cifras')!.textContent).toContain('1 completadas');
  });

  it('sin citas pendientes muestra un mensaje', async () => {
    const el = await montar({ citas: [citas[2]] });
    expect(sombra(el).querySelector('.vacio')!.textContent).toContain('No quedan citas');
  });

  it('al pulsar una cita emite "cita-seleccionada" con su id, y el evento sale del Shadow DOM', async () => {
    const el = await montar({ citas });
    const recibido = vi.fn();
    // Se escucha en document: solo llega si el evento es bubbles + composed.
    document.addEventListener('cita-seleccionada', (e) =>
      recibido((e as CustomEvent).detail),
    );

    sombra(el).querySelector('button')!.click();

    expect(recibido).toHaveBeenCalledWith({ id: 'a-1' });
  });

  it('los botones tienen un nombre accesible completo', async () => {
    const el = await montar({ citas });
    expect(sombra(el).querySelector('button')!.getAttribute('aria-label')).toBe(
      'Abrir cita de Lucía García a las 09:30',
    );
  });
});
