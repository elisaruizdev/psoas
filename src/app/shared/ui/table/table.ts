import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TableCell, TableConfig, TableRow } from '../../models/table.model';

@Component({
  selector: 'f-table',
  standalone: true,
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
export class Table implements AfterViewInit, OnChanges {
  @Input() config!: TableConfig;
  @Output() rowClick = new EventEmitter<{ row: TableRow; param?: string }>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource!: MatTableDataSource<TableRow>;
  displayedColumns: string[] = [];
  filterValue: string = '';

  showFilter: boolean = true;
  filterPlaceholder: string = 'Buscar...';
  pageSizeOptions: number[] = [5, 10, 20];
  noDataMessage: string = 'No hay datos disponibles';

  ngOnInit() {
    this.initializeTable();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && !changes['config'].firstChange) {
      this.updateTableData();
    }
  }

  ngAfterViewInit() {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  private initializeTable() {
    this.displayedColumns = this.config.columns.map((col) => col.key);

    this.dataSource = new MatTableDataSource(this.config.data);

    this.showFilter = this.config.showFilter ?? true;
    this.filterPlaceholder = this.config.filterPlaceholder ?? 'Buscar...';
    this.pageSizeOptions = this.config.pageSizeOptions ?? [5, 10, 20];
    this.noDataMessage = this.config.noDataMessage ?? 'No hay datos disponibles';
  }

  private updateTableData() {
    if (this.dataSource && this.config.data) {
      this.dataSource.data = this.config.data;
    }
  }

  getColumnLabel(columnKey: string): string {
    const column = this.config.columns.find((col) => col.key === columnKey);
    return column?.label || columnKey;
  }

  getColumnValue(row: TableRow, columnKey: string): string {
    const column = this.config.columns.find((col) => col.key === columnKey);
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
    const column = this.config.columns.find((col) => col.key === columnKey);
    return column?.sortable !== false;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterValue = filterValue.trim().toLowerCase();
    this.dataSource.filter = this.filterValue;

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onRowClick(row: TableRow) {
    if (this.config.clickableRows) {
      this.rowClick.emit({
        row,
        param: this.config.clickableParams,
      });
    }
  }

  get isClickable(): boolean {
    return this.config.clickableRows ?? false;
  }
}
