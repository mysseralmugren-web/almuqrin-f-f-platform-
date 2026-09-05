import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Play, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/ai-assistant/render")({
  head: () => ({
    meta: [
      { title: "الرندر ثلاثي الأبعاد · AlMugren AI Factory OS" },
      {
        name: "description",
        content:
          "Submit tenant-audited furniture render jobs to the secured cloud Blender/Rend adapter.",
      },
    ],
  }),
  component: RenderStudio,
});

type RenderJob = {
  id: string;
  worker_job_id: string | null;
  status: "queued" | "submitted" | "running" | "succeeded" | "failed" | "cancelled";
  scene_spec: Record<string, unknown>;
  quality: string;
  preset?: string;
  subject_size_m?: number;
  error_message: string | null;
  created_at: string;
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("render-engine", { body });
  if (error) throw error;
  return data;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function RenderStudio() {
  const t = useT();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(
    "رندر منتج أثاث واقعي بخامات PBR وإضاءة استوديو احترافية، مع الحفاظ على المقاسات المعتمدة.",
  );
  const [subjectSize, setSubjectSize] = useState("1");
  const [quality, setQuality] = useState("high");
  const [format, setFormat] = useState("png");
  const [preset, setPreset] = useState("studio_three_point");
  const [sceneSpec, setSceneSpec] = useState("");
  const [latest, setLatest] = useState<RenderJob | null>(null);
  const [resultUrl, setResultUrl] = useState("");

  const healthQ = useQuery({
    queryKey: ["render-engine-health"],
    queryFn: () => invoke({ action: "health" }),
    retry: false,
    staleTime: 30_000,
  });
  const jobsQ = useQuery({
    queryKey: ["render-jobs"],
    queryFn: async () => {
      // The migration is deployed with this feature; generated Database types update after the next Supabase type pull.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("interior_render_jobs")
        .select(
          "id,worker_job_id,status,scene_spec,quality,preset,subject_size_m,error_message,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as RenderJob[];
    },
    refetchInterval: 15_000,
  });

  const submitM = useMutation({
    mutationFn: async () => {
      let parsedScene: Record<string, unknown> | null = null;
      if (sceneSpec.trim()) {
        try {
          parsedScene = JSON.parse(sceneSpec);
        } catch {
          throw new Error(t("Scene JSON غير صالح", "Invalid scene JSON"));
        }
      }
      if (!parsedScene) {
        parsedScene = {
          version: "2.0",
          kind: "furniture_product",
          prompt,
          studio: { preset, subjectSizeM: Number(subjectSize) },
          safeguards: { preserveApprovedDimensions: true, noInventedMeasurements: true },
        };
      }
      const data = await invoke({
        action: "submit",
        prompt,
        subjectSizeM: Number(subjectSize),
        quality,
        outputFormat: format,
        preset,
        sceneSpec: parsedScene,
        idempotencyKey: `render_${crypto.randomUUID()}`,
      });
      return data.job as RenderJob;
    },
    onSuccess: async (job) => {
      setLatest(job);
      setResultUrl("");
      toast.success(t("تم إرسال مهمة الرندر", "Render job submitted"));
      await qc.invalidateQueries({ queryKey: ["render-jobs"] });
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, t("فشل إرسال الرندر", "Render submission failed"))),
  });

  const statusM = useMutation({
    mutationFn: async (jobId: string) =>
      (await invoke({ action: "status", jobId })).job as RenderJob,
    onSuccess: async (job) => {
      setLatest(job);
      await qc.invalidateQueries({ queryKey: ["render-jobs"] });
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, t("تعذر تحديث الحالة", "Could not refresh status"))),
  });

  const resultM = useMutation({
    mutationFn: async (jobId: string) => invoke({ action: "result", jobId }),
    onSuccess: (data) => setResultUrl(String(data.signedUrl ?? "")),
    onError: (error: unknown) =>
      toast.error(errorMessage(error, t("نتيجة الرندر غير جاهزة", "Render result is not ready"))),
  });

  const connected = Boolean(healthQ.data?.connected);
  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            {t("استوديو الرندر الواقعي", "Photorealistic render studio")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${connected ? "border-emerald-500/40" : "border-amber-500/40"}`}
          >
            {connected ? (
              <Wifi className="h-4 w-4 text-emerald-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-600" />
            )}
            <span>
              {connected
                ? t("Rend / Sceneplane متصل وجاهز", "Rend / Sceneplane is connected")
                : t(
                    "أضف إعدادات مزود الرندر لإكمال الاتصال الحي",
                    "Add render provider settings to complete the live connection",
                  )}
            </span>
            <Button className="ms-auto" size="sm" variant="ghost" onClick={() => healthQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label>
              {t("وصف القطعة والخامات والمقاسات", "Furniture, materials and dimensions")}
            </Label>
            <Textarea
              rows={5}
              maxLength={4000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>{t("أكبر بُعد بالمتر", "Largest dimension (m)")}</Label>
              <Input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={subjectSize}
                onChange={(e) => setSubjectSize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("الإضاءة", "Lighting")}</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio_three_point">3-Point Studio</SelectItem>
                  <SelectItem value="softbox_product">Softbox Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("الجودة", "Quality")}</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("الإخراج", "Output")}</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("Scene Spec متقدم (اختياري)", "Advanced Scene Spec (optional)")}
            </summary>
            <Textarea
              dir="ltr"
              className="mt-3 font-mono text-xs"
              rows={6}
              value={sceneSpec}
              onChange={(e) => setSceneSpec(e.target.value)}
              placeholder='{"camera":{"lensMm":50},"materials":[]}'
            />
          </details>
          <Button
            onClick={() => submitM.mutate()}
            disabled={!connected || submitM.isPending || prompt.trim().length < 10}
          >
            <Play className="me-2 h-4 w-4" />
            {submitM.isPending
              ? t("جارٍ الإرسال…", "Submitting…")
              : t("بدء الرندر", "Start render")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t(
              "الإعداد الثابت: Cycles + Denoise + AgX. كل مهمة تُسجل داخل شركة المستخدم ولا تُشارك مع الشركات الأخرى.",
              "Fixed pipeline: Cycles + Denoise + AgX. Every job is tenant-isolated and audited.",
            )}
          </p>
        </CardContent>
      </Card>

      {latest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("آخر نتيجة", "Latest result")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Badge>{latest.status}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusM.mutate(latest.id)}
                disabled={statusM.isPending}
              >
                <RefreshCw className="me-2 h-3.5 w-3.5" />
                {t("تحديث", "Refresh")}
              </Button>
              {latest.status === "succeeded" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resultM.mutate(latest.id)}
                  disabled={resultM.isPending}
                >
                  {t("فتح النتيجة", "Open result")}
                </Button>
              )}
            </div>
            {resultUrl && (
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-block text-sm text-primary underline"
              >
                {t("عرض ملف الرندر لمدة 15 دقيقة", "View signed render file for 15 minutes")}
              </a>
            )}
            <pre
              className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs"
              dir="ltr"
            >
              {JSON.stringify(latest, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("سجل مهام الرندر", "Render job history")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(jobsQ.data ?? []).map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setLatest(job)}
              className="flex w-full items-center justify-between rounded-lg border p-3 text-start hover:bg-muted"
            >
              <div>
                <div className="text-sm font-medium">
                  {String(job.scene_spec?.prompt ?? t("مهمة رندر", "Render job")).slice(0, 90)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                  {new Date(job.created_at).toLocaleString()}
                </div>
              </div>
              <Badge variant={job.status === "failed" ? "destructive" : "outline"}>
                {job.status}
              </Badge>
            </button>
          ))}
          {!jobsQ.isLoading && (jobsQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("لا توجد مهام حتى الآن", "No render jobs yet")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
