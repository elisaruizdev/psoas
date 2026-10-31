import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatTableHarness } from '@angular/material/table/testing';
import { MatSortHarness } from '@angular/material/sort/testing';

import { Table } from './table';
import { TableConfig, TableRowClick } from '../../models/table.model';

describe('Table', () => {
  let fixture: ComponentFixture<Table>;
  let emitted: TableRowClick[];

  function render(config: Partial<TableConfig> = {}): HTMLElement {
    fixture.componentRef.setInput('config', {
      columns: [{ key: 'name', label: 'Nombre' }],
      data: [
        { id: 1, name: 'Lucía' },
        { id: 2, name: 'Mario' },
      ],
      ...config,
    });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function bodyRows(element: HTMLElement): HTMLTableRowElement[] {
    return Array.from(element.querySelectorAll<HTMLTableRowElement>('tr.mat-mdc-row'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Table],
    }).compileComponents();
    fixture = TestBed.createComponent(Table);
    emitted = [];
    fixture.componentInstance.rowClick.subscribe((event) => emitted.push(event));
  });

  it('pinta una fila por dato con su valor', () => {
    const rows = bodyRows(render());
    expect(rows.map((row) => row.textContent?.trim())).toEqual(['Lucía', 'Mario']);
  });

  it('emite rowClick con la fila y el parámetro al hacer clic', () => {
    const [first] = bodyRows(render({ clickableRows: true, clickableParams: 'view' }));

    first.click();

    expect(emitted).toEqual([{ row: { id: 1, name: 'Lucía' }, param: 'view' }]);
  });

  it('no emite nada si las filas no son clicables', () => {
    const [first] = bodyRows(render({ clickableRows: false }));

    first.click();

    expect(emitted).toEqual([]);
  });

  describe('con component harnesses de Angular Material', () => {
    // Un harness es un Page Object oficial del componente de Material: se le pregunta
    // por filas, celdas u orden sin depender de sus clases CSS internas.
    async function harness(config: Partial<TableConfig> = {}) {
      render(config);
      const loader = TestbedHarnessEnvironment.loader(fixture);
      return {
        tabla: await loader.getHarness(MatTableHarness),
        orden: await loader.getHarness(MatSortHarness),
      };
    }

    it('lee cabeceras y celdas como texto', async () => {
      const { tabla } = await harness();

      const [cabecera] = await tabla.getHeaderRows();
      expect(await cabecera.getCellTextByIndex()).toEqual(['Nombre']);
      expect(await tabla.getCellTextByColumnName()).toEqual(
        jasmine.objectContaining({ name: jasmine.objectContaining({ text: ['Lucía', 'Mario'] }) }),
      );
    });

    it('ordena al pulsar la cabecera (asc y luego desc)', async () => {
      const { tabla, orden } = await harness();
      const [cabecera] = await orden.getSortHeaders();
      const nombres = async () =>
        Promise.all((await tabla.getRows()).map(async (fila) => (await fila.getCellTextByIndex())[0]));

      await cabecera.click();
      expect(await cabecera.getSortDirection()).toBe('asc');
      expect(await nombres()).toEqual(['Lucía', 'Mario']);

      await cabecera.click();
      expect(await cabecera.getSortDirection()).toBe('desc');
      expect(await nombres()).toEqual(['Mario', 'Lucía']);
    });

    it('una columna con sortable: false no se puede ordenar', async () => {
      const { orden } = await harness({ columns: [{ key: 'name', label: 'Nombre', sortable: false }] });
      const [cabecera] = await orden.getSortHeaders();
      expect(await cabecera.isDisabled()).toBeTrue();
    });
  });

  describe('accesibilidad con teclado', () => {
    it('las filas clicables entran en el orden de tabulación', () => {
      const rows = bodyRows(render({ clickableRows: true }));
      expect(rows.every((row) => row.tabIndex === 0)).toBeTrue();
    });

    it('las filas no clicables no reciben foco', () => {
      const rows = bodyRows(render({ clickableRows: false }));
      expect(rows.every((row) => !row.hasAttribute('tabindex'))).toBeTrue();
    });

    it('Enter sobre una fila clicable la abre', () => {
      const [, second] = bodyRows(render({ clickableRows: true }));

      second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(emitted.map((event) => event.row.id)).toEqual([2]);
    });

    it('Espacio sobre una fila clicable la abre y no hace scroll', () => {
      const [first] = bodyRows(render({ clickableRows: true }));
      const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

      first.dispatchEvent(space);

      expect(emitted.map((event) => event.row.id)).toEqual([1]);
      expect(space.defaultPrevented).toBeTrue();
    });

    it('anuncia a los lectores de pantalla que la fila abre algo', () => {
      const [first] = bodyRows(render({ clickableRows: true }));
      expect(first.getAttribute('aria-label')).toContain('Lucía');
    });
  });
});
