import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { aiErrorText, AI_ALLOWED_MIME, AI_ALLOWED_EXT } from "@/lib/ai-constants";

export const AI_BUCKET = "mfg-attachments";

export function useAiFail() {
  const ar = useTheme().lang === "ar";
  return (e: unknown) => toast.error(aiErrorText(e instanceof Error ? e.message : String(e), ar));
}

export function AiLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "…"}
    </div>
  );
}

const TONE: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  applied: "bg-emerald-500/10 text-emerald-600",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-600",
  info: "bg-sky-500/10 text-sky-600",
  fact: "bg-emerald-500/10 text-emerald-600",
  assumption: "bg-amber-500/10 text-amber-600",
  estimate: "bg-sky-500/10 text-sky-600",
};

export function AiChip({ value, label }: { value: string; label: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[value] ?? "bg-muted text-muted-foreground"}`}>{label}</span>;
}

export function ConfidenceBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <Badge variant="outline">—</Badge>;
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "bg-emerald-500/10 text-emerald-600" : pct >= 60 ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`} dir="ltr">{pct}%</span>;
}

export function validateFile(file: File) {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!(AI_ALLOWED_MIME as readonly string[]).includes(file.type)) return "AI_MIME_NOT_ALLOWED";
  if (!(AI_ALLOWED_EXT as readonly string[]).includes(ext)) return "AI_MIME_NOT_ALLOWED";
  return null;
}

/** Uploads through a short-lived signed URL issued by the server; the browser never sees storage credentials. */
export async function uploadToSignedUrl(path: string, token: string, file: File) {
  const { error } = await supabase.storage.from(AI_BUCKET).uploadToSignedUrl(path, token, file);
  if (error) throw new Error(error.message);
}

export function newIdempotencyKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function money(v: unknown, digits = 3) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

