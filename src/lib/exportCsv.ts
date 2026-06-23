/**
 * Minimal client-side CSV export — no dependency. Triggers a file download of
 * `rows` (array of objects) with the given filename.
 */
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (typeof document === "undefined" || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(";")),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
