import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { projectErrorText, labelOf } from "@/lib/projects-constants";

export function useProjectFail() {
  const ar = useTheme().lang === "ar";
  return (e: unknown) => toast.error(projectErrorText(e instanceof Error ? e.message : String(e), ar));
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "…"}
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planning: "bg-sky-500/10 text-sky-600",
  survey: "bg-sky-500/10 text-sky-600",
  design: "bg-indigo-500/10 text-indigo-600",
  submitted: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  customer_approved: "bg-emerald-500/10 text-emerald-600",
  in_production: "bg-amber-500/10 text-amber-600",
  scheduled: "bg-sky-500/10 text-sky-600",
  dispatched: "bg-indigo-500/10 text-indigo-600",
  installation: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  paused: "bg-orange-500/10 text-orange-600",
  handover: "bg-indigo-500/10 text-indigo-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  delivered: "bg-emerald-500/10 text-emerald-600",
  acknowledged: "bg-emerald-500/10 text-emerald-600",
  done: "bg-emerald-500/10 text-emerald-600",
  verified: "bg-emerald-500/10 text-emerald-600",
  fixed: "bg-emerald-500/10 text-emerald-600",
  active: "bg-emerald-500/10 text-emerald-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  closed: "bg-muted text-muted-foreground",
  on_hold: "bg-orange-500/10 text-orange-600",
  blocked: "bg-destructive/10 text-destructive",
  open: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  void: "bg-destructive/10 text-destructive",
  expired: "bg-destructive/10 text-destructive",
  new: "bg-sky-500/10 text-sky-600",
};

export function StatusChip({
  value,
  map,
}: {
  value: string | null | undefined;
  map: Record<string, { ar: string; en: string }>;
}) {
  const ar = useTheme().lang === "ar";
  const key = value ?? "";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TONE[key] ?? "bg-muted text-muted-foreground"}`}>
      {labelOf(map, key, ar)}
    </span>
  );
}

export function CriticalBadge({ ar }: { ar: boolean }) {
  return <Badge variant="destructive" className="text-[10px]">{ar ? "حرجة" : "Critical"}</Badge>;
}

export function money(v: unknown) {
  return Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full gradient-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ---------- private file upload / view ---------- */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createProjectUploadUrl, getProjectFileUrl, PROJECT_BUCKET } from "@/lib/projects.functions";

export function UploadButton({
  projectId,
  kind,
  label,
  onUploaded,
}: {
  projectId: string;
  kind: string;
  label: string;
  onUploaded: (path: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const fail = useProjectFail();

  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const { path, token } = await createProjectUploadUrl({ data: { project_id: projectId, kind, file_name: file.name } });
            const { error } = await supabase.storage.from(PROJECT_BUCKET).uploadToSignedUrl(path, token, file);
            if (error) throw error;
            onUploaded(path);
          } catch (err) {
            fail(err);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </>
  );
}

export function ViewFileButton({ path, label }: { path: string | null | undefined; label: string }) {
  const fail = useProjectFail();
  if (!path) return null;
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1"
      onClick={async () => {
        try {
          const { url } = await getProjectFileUrl({ data: { object_path: path } });
          window.open(url, "_blank", "noopener");
        } catch (e) {
          fail(e);
        }
      }}
    >
      <Eye className="h-4 w-4" />
      {label}
    </Button>
  );
}

