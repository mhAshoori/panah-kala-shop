// RFC 4180 CSV builder with UTF-8 BOM (Excel opens Persian text correctly)
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v == null) return '';
    let s = String(v);
    // Neutralize formula injection: cells starting with =+-@ would execute
    // as formulas when an admin opens the export in Excel
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  return '﻿' + lines.join('\r\n');
}
