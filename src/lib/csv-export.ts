/**
 * Client-side CSV export.
 *
 * Takes a column definition + row data and triggers a browser download via
 * Blob + URL.createObjectURL. Reusable across tables.
 *
 * Example:
 *   downloadCsv({
 *     columns: [
 *       { key: 'title', label: 'Title' },
 *       { key: 'pages', label: 'Total Pages', format: (v) => String(v) },
 *     ],
 *     rows: [{ title: 'Aulakh', pages: 295 }, ...],
 *     filename: 'export.csv',
 *   });
 */

export interface CsvColumn<TRow> {
  /** The label that appears in the header row of the CSV. */
  label: string;
  /** A function that extracts the cell value from a row. */
  value: (row: TRow) => string | number | boolean | null | undefined;
}

export interface DownloadCsvOptions<TRow> {
  columns: ReadonlyArray<CsvColumn<TRow>>;
  rows: ReadonlyArray<TRow>;
  filename: string;
}

/**
 * Quote a single CSV field per RFC 4180:
 * - if the field contains a comma, double-quote, or newline, wrap in double quotes
 * - escape internal double quotes by doubling them
 *
 * Also neutralizes leading formula-trigger characters (=, +, -, @, \t, \r) by
 * prefixing them with a single quote — protects against CSV injection when the
 * file is opened in Excel or Google Sheets. Mirrors the convention used by
 * `csvSafeEscape` in src/utils/format.ts.
 */
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Formula-trigger neutralization: any value starting with =, +, -, @, tab,
  // or carriage return could be interpreted as a formula by spreadsheet apps.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const needsQuoting = /[",\r\n]/.test(str);
  if (!needsQuoting) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generate the CSV text for a set of columns + rows. Useful for testing
 * (downloadCsv triggers a browser-only side effect).
 */
export function buildCsv<TRow>(options: Omit<DownloadCsvOptions<TRow>, 'filename'>): string {
  const { columns, rows } = options;
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCsvField(c.label)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvField(c.value(row))).join(','));
  }
  // Trailing newline per RFC 4180 convention
  return lines.join('\r\n') + '\r\n';
}

/**
 * Build the CSV and trigger a browser download.
 *
 * Skips silently if `window` is unavailable (server-side rendering, tests
 * without jsdom). Caller should ensure rows are already filtered/sorted to
 * match the visible table state.
 */
export function downloadCsv<TRow>(options: DownloadCsvOptions<TRow>): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const csv = buildCsv(options);
  // BOM helps Excel detect UTF-8
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke async so the click has time to register
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
