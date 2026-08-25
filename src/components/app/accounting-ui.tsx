import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { accountingErrorText } from "@/lib/accounting-constants";

export function useAr() {
  return useTheme().lang === "ar";
}

export function useAccFail() {
  const ar = useAr();
  return (e: unknown) => toast.error(accountingErrorText(e instanceof Error ? e.message : String(e), ar));
}

export function money(v: unknown) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

