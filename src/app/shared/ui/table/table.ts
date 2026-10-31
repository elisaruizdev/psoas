import { Component, computed, effect, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TableCell, TableConfig, TableRow, TableRowClick } from '../../models/table.model';

@Component({
  selector: 'f-table',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  config = input.required<TableConfig>();
  rowClick = output<TableRowClick>();

  private paginator = viewChild(MatPaginator);
  private sort = viewChild(MatSort);

  readonly dataSource = new MatTableDataSource<TableRow>([]);
  filterValue = '';

  // Todo lo que sale de la configuración se deriva con computed: si el padre
  // cambia `config`, se recalcula solo. Sustituye a ngOnInit + ngOnChanges.
  displayedColumns = computed(() => this.config().columns.map((col) => col.key));
  showFilter = computed(() => this.config().showFilter ?? true);
  filterPlaceholder = computed(() => this.config().filterPlaceholder ?? 'Buscar...');
  pageSizeOptions = computed(() => this.config().pageSizeOptions ?? [5, 10, 20]);
  noDataMessage = computed(() => this.config().noDataMessage ?? 'No hay datos disponibles');
  isClickable = computed(() => this.config().clickableRows ?? false);

  constructor() {
    // MatTableDataSource no es reactivo a signals: se sincroniza con efectos.
    effect(() => {
      this.dataSource.data = this.config().data;
    });
    effect(() => {
      this.dataSource.paginator = this.paginator() ?? null;
      this.dataSource.sort = this.sort() ?? null;
    });
  }

  private column(columnKey: string) {
    return this.config().columns.find((col) => col.key === columnKey);
  }

  getColumnLabel(columnKey: string): string {
    return this.column(columnKey)?.label || columnKey;
  }

  getColumnValue(row: TableRow, columnKey: string): string {
    const column = this.column(columnKey);
    const value: TableCell = row[columnKey];

    if (column?.format) {
      return column.format(value);
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  isColumnSortable(columnKey: string): boolean {
    return this.column(columnKey)?.sortable !== false;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue = filterValue.trim().toLowerCase();
    this.dataSource.filter = this.filterValue;
    this.dataSource.paginator?.firstPage();
  }

  onRowClick(row: TableRow) {
    if (this.isClickable()) {
      this.rowClick.emit({ row, param: this.config().clickableParams });
    }
  }

  /** Espacio activa la fila como un botón; sin preventDefault la página haría scroll. */
  onRowSpace(event: Event, row: TableRow) {
    event.preventDefault();
    this.onRowClick(row);
  }

  /** Nombre accesible de la fila: lo que lee un lector de pantalla al enfocarla. */
  getRowLabel(row: TableRow): string {
    const firstColumn = this.displayedColumns()[0];
    const summary = firstColumn ? this.getColumnValue(row, firstColumn) : '';
    return `Abrir detalle: ${summary}`.trim();
  }
}
