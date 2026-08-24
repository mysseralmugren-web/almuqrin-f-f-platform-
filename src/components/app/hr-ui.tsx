import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { hrErrorText } from "@/lib/hr-constants";

export function useHrFail() {
  const ar = useTheme().lang === "ar";
  return (e: unknown) => toast.error(hrErrorText(e instanceof Error ? e.message : String(e), ar));
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "..."}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      {message}
    </div>
  );
}

export function riyal(v: unknown) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function mins(v: unknown) {
  const n = Math.max(0, Number(v ?? 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/** Masks identity/IBAN values so only the last 4 characters are visible. */
export function mask(value?: string | null) {
  if (!value) return "—";
  const s = String(value);
  return s.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

