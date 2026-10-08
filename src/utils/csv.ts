export type CsvCell = string | number | boolean | null | undefined;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n');
}

/** Triggers a browser download of text content. */
export function downloadText(filename: string, content: string | Uint8Array, type = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
