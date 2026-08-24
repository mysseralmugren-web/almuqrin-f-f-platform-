import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { documentsErrorText, DOC_STATUS_LABEL, type DocStatus } from "@/lib/documents-constants";
import { Badge } from "@/components/ui/badge";

export function useAr() {
  return useTheme().lang === "ar";
}

export function useDocFail() {
  const ar = useAr();
  return (e: unknown) => toast.error(documentsErrorText(e instanceof Error ? e.message : String(e), ar));
}

export function money(v: unknown) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VARIANT: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  draft: "outline",
  review: "secondary",
  approved: "default",
  issued: "default",
  void: "destructive",
  rejected: "destructive",
  expired: "destructive",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const ar = useAr();
  const fallback = DOC_STATUS_LABEL[status as DocStatus];
  return (
    <Badge variant={VARIANT[status] ?? "secondary"}>
      {label ?? (fallback ? (ar ? fallback.ar : fallback.en) : status)}
    </Badge>
  );
}
