import type { ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/lib/theme";
import { purchaseErrorText } from "@/lib/purchasing-constants";

export function useAr() {
  return useTheme().lang === "ar";
}

export function useFail() {
  const ar = useAr();
  return (e: unknown) => toast.error(purchaseErrorText(e instanceof Error ? e.message : String(e), ar));
}

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  matched: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  awarded: "bg-accent/15 text-accent-foreground",
  posted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  received: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  executed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  partially_received: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  discrepancy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  on_hold: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  blocked: "bg-destructive/10 text-destructive",
  void: "bg-destructive/10 text-destructive",
};

export function StatusPill({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, { ar: string; en: string }>;
}) {
  const ar = useAr();
  const label = labels[status];
  return (
    <Badge variant="secondary" className={`border-0 font-medium ${TONE[status] ?? "bg-muted text-muted-foreground"}`}>
      {label ? (ar ? label.ar : label.en) : status}
    </Badge>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
        <p className="font-medium">{title}</p>
        {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function money(v: unknown) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

