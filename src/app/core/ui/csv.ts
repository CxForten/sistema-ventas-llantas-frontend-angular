export const Csv = {
  /** 7250 → "72,50" — coma decimal, que es lo que espera Excel en español. */
  money(cents: number | null | undefined): string {
    return ((cents ?? 0) / 100).toFixed(2).replace('.', ',');
  },
 
  /** Escapa un valor para CSV. */
  cell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    // Comillas dobles internas se duplican; todo va entre comillas
    return `"${text.replace(/"/g, '""')}"`;
  },
 
  /** Arma el contenido y dispara la descarga. */
  download(filename: string, headers: string[], rows: unknown[][]): void {
    const lines = [
      'sep=;',
      headers.map((h) => this.cell(h)).join(';'),
      ...rows.map((row) => row.map((c) => this.cell(c)).join(';')),
    ];
 
    // \r\n porque Excel en Windows lo prefiere
    const content = '\uFEFF' + lines.join('\r\n');
 
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
 
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
 
    URL.revokeObjectURL(url);
  },
 
  /** Fecha para el nombre del archivo: 2026-09-10 */
  today(): string {
    return new Date().toISOString().slice(0, 10);
  },
};