const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

/** Prevent spreadsheet formula execution while preserving the displayed value. */
export function neutralizeCsvFormula(value: unknown): string {
  const text = String(value ?? "");
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function recordsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escapeCell = (value: unknown) =>
    `"${neutralizeCsvFormula(value).replace(/"/g, '""')}"`;
  return [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\r\n");
}

