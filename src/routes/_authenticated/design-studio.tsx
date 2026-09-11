import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, BrainCircuit, CheckCircle2, Play, RefreshCw, Rotate3D, Sparkles, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ModelViewer } from "@/components/storefront/model-viewer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/design-studio")({
  head: () => ({
    meta: [
      { title: "استوديو المقرن للتصميم التفاعلي 3D" },
      { name: "description", content: "AI interior design to interactive GLB and manufacturing review workflow." },
    ],
  }),
  component: DesignStudio,
});

type RenderJob = {
  id: string;
  status: "queued" | "submitted" | "running" | "succeeded" | "failed" | "cancelled";
  output_content_type?: string | null;
  error_message?: string | null;
  created_at?: string;
};

const STYLES = ["Modern", "Luxury", "Minimal", "Japandi", "Industrial", "New Classic", "Najdi", "Corporate"];

async function invokeRender(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("render-engine", { body });
  if (error) throw error;
  return data;
}

function DesignStudio() {
  const qc = useQueryClient();
  const [roomType, setRoomType] = useState("مكتب مدير");
  const [style, setStyle] = useState("Luxury");
  const [width, setWidth] = useState("6");
  const [length, setLength] = useState("8");
  const [height, setHeight] = useState("3.2");
  const [prompt, setPrompt] = useState("صمم مساحة داخلية احترافية قابلة للتنفيذ لمصنع المقرن، بتوزيع أثاث مناسب وخامات وإضاءة مدروسة، مع الحفاظ على المقاسات المثبتة فقط.");
  const [latest, setLatest] = useState<RenderJob | null>(null);
  const [modelUrl, setModelUrl] = useState("");

  const healthQ = useQuery({
    queryKey: ["design-studio-render-health"],
    queryFn: () => invokeRender({ action: "health" }),
    retry: false,
    staleTime: 30_000,
  });

  const connected = Boolean(healthQ.data?.connected);
  const dimensions = useMemo(() => ({ width: Number(width), length: Number(length), height: Number(height) }), [width, length, height]);

  const submitM = useMutation({
    mutationFn: async () => {
      if (![dimensions.width, dimensions.length, dimensions.height].every((n) => Number.isFinite(n) && n > 0)) {
        throw new Error("أدخل أبعادًا صحيحة للمساحة");
      }
      const sceneSpec = {
        version: "2.0",
        kind: "interior_design",
        room: { ...dimensions, unit: "m", type: roomType },
        design: { style, prompt },
        safeguards: {
          preserveApprovedDimensions: true,
          noInventedMeasurements: true,
          humanReviewRequiredBeforeFabrication: true,
        },
        camera: {
          location: [dimensions.width * 0.7, -dimensions.length * 0.8, Math.max(1.8, dimensions.height * 0.65)],
          target: [0, 0, Math.min(1.4, dimensions.height / 2)],
        },
        world: { strength: 0.7 },
      };
      const data = await invokeRender({
        action: "submit",
        prompt,
        subjectSizeM: Math.max(dimensions.width, dimensions.length, dimensions.height),
        quality: "high",
        outputFormat: "glb",
        preset: "studio_three_point",
        sceneSpec,
        idempotencyKey: `design3d_${crypto.randomUUID()}`,
      });
      return data.job as RenderJob;
    },
    onSuccess: async (job) => {
      setLatest(job);
      setModelUrl("");
      toast.success("تم إرسال التصميم لمحرك Blender لإنشاء GLB تفاعلي");
      await qc.invalidateQueries({ queryKey: ["design-studio-render-jobs"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر إرسال التصميم للرندر"),
  });

  const resultM = useMutation({
    mutationFn: async (jobId: string) => invokeRender({ action: "result", jobId }),
    onSuccess: (data) => {
      const url = String(data.signedUrl ?? "");
      setModelUrl(url);
      if (url) toast.success("ملف GLB جاهز للعرض التفاعلي");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "نتيجة الرندر غير جاهزة"),
  });

  const statusM = useMutation({
    mutationFn: async (jobId: string) => (await invokeRender({ action: "status", jobId })).job as RenderJob,
    onSuccess: (job) => {
      setLatest(job);
      if (job.status === "succeeded") resultM.mutate(job.id);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الرندر"),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Rotate3D className="h-6 w-6" />استوديو المقرن للتصميم الذكي 3D</h1>
          <p className="mt-1 text-sm text-muted-foreground">تصميم المساحة → Blender → GLB تفاعلي → مراجعة بشرية قبل التصنيع</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/ai-assistant/design"><Sparkles className="ml-2 h-4 w-4" />موجز التصميم AI</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/ai-assistant/interior-twin"><BrainCircuit className="ml-2 h-4 w-4" />التوأم الرقمي</Link></Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">إعداد المساحة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${connected ? "border-emerald-500/40" : "border-amber-500/40"}`}>
              {connected ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
              <span>{connected ? "Blender Worker متصل" : "محرك Blender غير متصل"}</span>
              <Button className="mr-auto" size="sm" variant="ghost" onClick={() => healthQ.refetch()}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2"><Label>نوع المساحة</Label><Input value={roomType} onChange={(e) => setRoomType(e.target.value)} /></div>
            <div className="space-y-2"><Label>النمط</Label><Select value={style} onValueChange={setStyle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STYLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2"><Label>العرض م</Label><Input inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} /></div>
              <div className="space-y-2"><Label>الطول م</Label><Input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} /></div>
              <div className="space-y-2"><Label>الارتفاع م</Label><Input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>تعليمات المصمم الذكي</Label><Textarea rows={7} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
            <Button className="w-full" disabled={!connected || submitM.isPending || prompt.trim().length < 10} onClick={() => submitM.mutate()}>
              <Play className="ml-2 h-4 w-4" />{submitM.isPending ? "جارٍ الإرسال…" : "إنشاء المشهد التفاعلي GLB"}
            </Button>
            <p className="text-xs text-muted-foreground">لا يتم اعتماد أي مقاس أو تحويله للتصنيع تلقائيًا. جميع المخرجات تحتاج مراجعة واعتمادًا بشريًا.</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-card">
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><Box className="h-4 w-4" />المشهد التفاعلي 360°</CardTitle></CardHeader>
          <CardContent className="p-4">
            {modelUrl ? (
              <ModelViewer src={modelUrl} alt="AlMuqrin interactive 3D design" />
            ) : (
              <div className="grid min-h-[440px] place-items-center rounded-[28px] border border-dashed bg-muted/30 p-8 text-center">
                <div><Rotate3D className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 font-semibold">سيظهر ملف GLB هنا</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">أنشئ المشهد، ثم حدّث حالة المهمة حتى يكتمل Blender. عند النجاح يُحمّل الرابط الموقّع ويظهر العارض التفاعلي تلقائيًا.</p></div>
              </div>
            )}

            {latest && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <Badge variant={latest.status === "failed" ? "destructive" : "outline"}>{latest.status}</Badge>
                <span className="text-xs text-muted-foreground" dir="ltr">{latest.id}</span>
                <Button size="sm" variant="outline" className="mr-auto" disabled={statusM.isPending} onClick={() => statusM.mutate(latest.id)}><RefreshCw className="ml-2 h-3.5 w-3.5" />تحديث الحالة</Button>
                {latest.status === "succeeded" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
