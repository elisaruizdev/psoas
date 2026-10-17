export type TableCell = string | number | boolean | null | undefined;

export interface TableRow {
  id: string | number;
  [column: string]: TableCell;
}

export interface TableRowClick {
  row: TableRow;
  param?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: TableCell) => string;
}

export interface TableConfig {
  columns: ColumnConfig[];
  data: TableRow[];
  filterPlaceholder?: string;
  pageSizeOptions?: number[];
  showFilter?: boolean;
  noDataMessage?: string;
  clickableRows?: boolean;
  clickableParams?: string;
}

