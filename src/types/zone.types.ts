export type CellType = 'TH' | 'TD';

export interface Cell {
  type: CellType;
  content: string;
  colspan: number;
  rowspan: number;
  align: 'left' | 'center' | 'right';
}

export interface TableRow {
  cells: Cell[];
}

export interface TableSection {
  rows: TableRow[];
}

export interface TableData {
  thead: TableSection;
  tbody: TableSection;
}
