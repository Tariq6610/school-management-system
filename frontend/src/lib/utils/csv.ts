/**
 * RFC 4180 compliant CSV generator and browser download utility.
 */

/**
 * Formats a single cell value according to RFC 4180 rules.
 * Escapes quotes by doubling them, and encloses values containing delimiters in quotes.
 */
export function formatCSVCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If value contains comma, double-quote, newline, or carriage return, enclose in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Serializes headers and 2D row array into an RFC 4180 CSV string with CRLF line endings.
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(formatCSVCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCSVCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a client-side file download of CSV content in browser environments.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Prepend UTF-8 BOM so Excel opens Urdu / foreign characters and symbols properly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
