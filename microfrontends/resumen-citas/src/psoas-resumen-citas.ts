import { LitElement, css, html, nothing } from 'lit';

/**
 * <psoas-resumen-citas>: microfrontend con el resumen de las citas del día.
 *
 * Es un Web Component estándar (Custom Element + Shadow DOM) hecho con Lit. No sabe nada de
 * Angular: cualquier app lo usa igual que un <input>. El "contrato" con quien lo usa es:
 *
 *   ENTRADAS
 *   - atributo `titulo`  (texto)            → <psoas-resumen-citas titulo="Hoy">
 *   - propiedad `citas`  (array de objetos) → el.citas = [...]   (en Angular: [citas]="...")
 *     Los atributos HTML solo admiten texto; los datos complejos van por propiedad.
 *
 *   SALIDAS
 *   - evento `cita-seleccionada` con detail { id }  (bubbles + composed: sale del Shadow DOM)
 *
 *   TEMA
 *   - variables CSS que SÍ atraviesan el Shadow DOM: --psoas-primario, --psoas-texto,
 *     --psoas-fondo, --psoas-borde, --psoas-radio. La app anfitriona pone sus colores.
 */

export type EstadoCita = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface CitaResumen {
  id: string;
  hora: string; // "09:30"
  paciente: string;
  estado: EstadoCita | string;
}

export interface CitaSeleccionadaDetail {
  id: string;
}

const ETIQUETAS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export class PsoasResumenCitas extends LitElement {
  // Propiedades reactivas: si cambian, Lit vuelve a pintar solo lo necesario.
  // `attribute: false` → `citas` solo se recibe como propiedad, nunca como atributo.
  static override properties = {
    titulo: { type: String },
    citas: { attribute: false },
  };

  declare titulo: string;
  declare citas: CitaResumen[];

  constructor() {
    super();
    this.titulo = 'Citas de hoy';
    this.citas = [];
  }

  static override styles = css`
    :host {
      display: block;
      font-family: inherit;
      color: var(--psoas-texto, #1f2937);
    }
    .tarjeta {
      background: var(--psoas-fondo, #fff);
      border: 1px solid var(--psoas-borde, #e5e7eb);
      border-radius: var(--psoas-radio, 12px);
      padding: 16px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1rem;
    }
    .cifras {
      display: flex;
      gap: 16px;
      margin: 0 0 12px;
      font-size: 0.875rem;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
    }
    button {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--psoas-borde, #e5e7eb);
      border-radius: 8px;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    button:hover,
    button:focus-visible {
      border-color: var(--psoas-primario, #2563eb);
      outline: none;
    }
    .hora {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .vacio {
      margin: 0;
      font-size: 0.875rem;
    }
  `;

  /** Citas no canceladas, por hora. Es un cálculo puro: fácil de probar. */
  get pendientes(): CitaResumen[] {
    return this.citas
      .filter((c) => c.estado !== 'cancelled' && c.estado !== 'completed')
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  get completadas(): number {
    return this.citas.filter((c) => c.estado === 'completed').length;
  }

  private seleccionar(id: string): void {
    this.dispatchEvent(
      new CustomEvent<CitaSeleccionadaDetail>('cita-seleccionada', {
        detail: { id },
        bubbles: true,
        composed: true, // sin esto, el evento no saldría del Shadow DOM
      }),
    );
  }

  override render() {
    const pendientes = this.pendientes;
    return html`
      <section class="tarjeta" aria-labelledby="titulo">
        <h2 id="titulo">${this.titulo}</h2>
        <p class="cifras">
          <span><strong>${pendientes.length}</strong> pendientes</span>
          <span><strong>${this.completadas}</strong> completadas</span>
        </p>
        ${pendientes.length === 0
          ? html`<p class="vacio">No quedan citas pendientes.</p>`
          : html`<ul>
              ${pendientes.map(
                (cita) => html`<li>
                  <button
                    type="button"
                    @click=${() => this.seleccionar(cita.id)}
                    aria-label="Abrir cita de ${cita.paciente} a las ${cita.hora}"
                  >
                    <span class="hora">${cita.hora}</span>
                    <span>${cita.paciente}</span>
                    <span>${ETIQUETAS[cita.estado] ?? nothing}</span>
                  </button>
                </li>`,
              )}
            </ul>`}
      </section>
    `;
  }
}

// Registro idempotente: si dos apps cargan el mismo bundle, la segunda no revienta.
if (!customElements.get('psoas-resumen-citas')) {
  customElements.define('psoas-resumen-citas', PsoasResumenCitas);
}

declare global {
  interface HTMLElementTagNameMap {
    'psoas-resumen-citas': PsoasResumenCitas;
  }
}
