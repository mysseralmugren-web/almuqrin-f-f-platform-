import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Palette, Layers, ShieldCheck, Calculator, Eye, BadgeCheck, Ruler, Scissors, Factory, ClipboardCheck, Play, Upload, Plus, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ai-assistant/interior-twin")({
  head: () => ({ meta: [{ title: "التوأم الرقمي للتصميم والتصنيع · منصة المقرن" }] }),
  component: InteriorTwinConsole,
});

type Attachment = { name: string; mimeType: string; dataUrl: string };
type TwinProject = { id: string; name: string; status: string; current_confidence: number | null; updated_at: string };
type TwinRun = { id: string; skill_key: string; stage: string; status: string; confidence: number | null; tool_adapter: string | null; output_data: any; created_at: string };

const workflow = [
  ["capture", "التقاط المساحة", Camera], ["design", "تصميم AI", Palette], ["materials", "الخامات والتشطيبات", Layers],
  ["manufacturability", "قابلية التصنيع", ShieldCheck], ["costing", "BOM والتكلفة", Calculator], ["immersive", "AR / VR", Eye],
  ["approval", "اعتماد", BadgeCheck], ["shop_drawings", "Shop Drawings", Ruler], ["nesting", "Nesting / CNC", Scissors],
  ["production", "الإنتاج", Factory], ["qc", "QC مقابل التوأم", ClipboardCheck],
] as const;

const skillOptions = [
  ["room_digital_twin", "1. توأم الغرفة الرقمي"],
  ["customer_design_dna", "2. بصمة ذوق العميل"],
  ["design_generation_brief", "3. تصميم AI متكامل"],
  ["material_finish_intelligence", "4. ذكاء الخامات والتشطيبات"],
  ["smart_material_advisor", "5. مستشار المواد الذكية"],
  ["design_manufacturability_check", "6. فحص قابلية التصنيع"],
  ["bom_generation", "7. توليد BOM"],
  ["furniture_cost_estimation", "8. حساب تكلفة التصنيع"],
  ["sustainable_design_score", "9. تقييم الاستدامة"],
  ["ar_furniture_placement", "10. AR للأثاث"],
  ["vr_project_walkthrough", "11. VR للمشروع"],
  ["real_time_design_configurator", "12. مهيئ التصميم اللحظي"],
  ["3d_print_prototype", "13. نموذج أولي 3D Print"],
  ["shop_drawing_planner", "14. Shop Drawings"],
  ["cutting_nesting_optimizer", "15. Nesting / CNC"],
  ["production_planning", "16. تخطيط الإنتاج"],
  ["twin_final_qc_compare", "17. مقارنة QC النهائية"],
] as const;

function InteriorTwinConsole() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("مشروع توأم رقمي جديد");
  const [selectedProject, setSelectedProject] = useState("");
  const [skillKey, setSkillKey] = useState("room_digital_twin");
  const [prompt, setPrompt] = useState("حلل البيانات المرفقة وطبّق هذه المرحلة بدقة على مشروع مصنع المقرن. لا تفترض أي مقاس غير مثبت.");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [assetUrl, setAssetUrl] = useState("");
  const [configuration, setConfiguration] = useState("{}");
  const [latestResult, setLatestResult] = useState<any>(null);

  const projectsQ = useQuery({
    queryKey: ["interior-twin-projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("interior_twin_projects").select("id,name,status,current_confidence,updated_at").order("updated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as TwinProject[];
    },
  });
  const activeId = selectedProject || projectsQ.data?.[0]?.id || "";
  const activeProject = projectsQ.data?.find((x) => x.id === activeId);
  const runsQ = useQuery({
    queryKey: ["interior-twin-runs", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("interior_twin_stage_runs").select("id,skill_key,stage,status,confidence,tool_adapter,output_data,created_at").eq("twin_project_id", activeId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as TwinRun[];
    },
  });
  const latestByStage = useMemo(() => {
    const map: Record<string, TwinRun> = {};
    for (const r of runsQ.data ?? []) if (!map[r.stage]) map[r.stage] = r;
    return map;
  }, [runsQ.data]);

  const createM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("interior-digital-twin", { body: { action: "create-project", name: newName } });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setSelectedProject(data.project.id);
      toast.success("تم إنشاء مشروع التوأم الرقمي");
      await qc.invalidateQueries({ queryKey: ["interior-twin-projects"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر إنشاء المشروع"),
  });

  const runM = useMutation({
    mutationFn: async () => {
      if (!activeId) throw new Error("أنشئ أو اختر مشروع توأم رقمي أولاً");
      let config: any = {};
      try { config = JSON.parse(configuration || "{}"); } catch { throw new Error("JSON التهيئة غير صالح"); }
      const body: any = {
        twinProjectId: activeId,
        skillKey,
        prompt,
        attachments,
        targetEntity: "interior_twin_project",
        targetId: activeId,
        environment: "production",
      };
      if (assetUrl) body.assetUrl = assetUrl;
      if (skillKey === "real_time_design_configurator") body.configuration = config;
      const { data, error } = await supabase.functions.invoke("ai-gateway", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      const downstream = data?.result ?? {};
      const resolved = {
        ...downstream,
        gatewayRunId: data?.gatewayRunId,
        traceId: data?.traceId,
        retrievedChunks: data?.retrievedChunks ?? 0,
        needsReview: data?.needsReview ?? downstream?.needsReview,
      };
      setLatestResult(resolved);
      toast.success(resolved.needsReview ? "اكتملت المرحلة عبر AI Gateway وبانتظار الاعتماد" : "اكتملت المرحلة عبر AI Gateway");
      await Promise.all([qc.invalidateQueries({ queryKey: ["interior-twin-projects"] }), qc.invalidateQueries({ queryKey: ["interior-twin-runs", activeId] })]);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل تنفيذ المرحلة عبر AI Gateway"),
  });

  const approveM = useMutation({
    mutationFn: async (stage: string) => {
      const { data, error } = await supabase.functions.invoke("interior-digital-twin", { body: { action: "approve-stage", twinProjectId: activeId, stage } });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("تم اعتماد المرحلة");
      await Promise.all([qc.invalidateQueries({ queryKey: ["interior-twin-projects"] }), qc.invalidateQueries({ queryKey: ["interior-twin-runs", activeId] })]);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر اعتماد المرحلة"),
  });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const out: Attachment[] = [];
      for (const file of Array.from(files).slice(0, 6)) {
        if (file.type.startsWith("video/")) out.push(...await extractVideoFrames(file, 6));
        else out.push({ name: file.name, mimeType: file.type || "application/octet-stream", dataUrl: await readDataUrl(file) });
      }
      setAttachments(out.slice(0, 12));
      toast.success(`تم تجهيز ${Math.min(out.length, 12)} ملف/لقطة للتحليل`);
    } catch (e: any) { toast.error(e?.message ?? "تعذر تجهيز الملفات"); }
  };

  return <div className="space-y-6">
    <Card className="shadow-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" />Digital Twin Workflow — التصميم إلى QC</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم مشروع التوأم الرقمي" />
          <Button onClick={() => createM.mutate()} disabled={createM.isPending}><Plus className="ml-2 h-4 w-4" />إنشاء مشروع</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2"><Label>المشروع الحالي</Label><Select value={activeId} onValueChange={setSelectedProject}><SelectTrigger><SelectValue placeholder="اختر مشروعًا" /></SelectTrigger><SelectContent>{(projectsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.status}</SelectItem>)}</SelectContent></Select></div>
          <div className="rounded-xl border p-3 text-sm"><div className="font-medium">الحالة الحالية: {activeProject?.status ?? "—"}</div><div className="mt-1 text-xs text-muted-foreground">الثقة: {activeProject?.current_confidence == null ? "—" : `${Math.round(activeProject.current_confidence * 100)}%`}</div></div>
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-3 xl:grid-cols-4">
      {workflow.map(([stage, label, Icon]) => {
        const r = latestByStage[stage];
        return <Card key={stage} className={activeProject?.status === stage ? "border-primary" : ""}><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4" /><div><div className="text-sm font-semibold">{label}</div><div className="text-[10px] text-muted-foreground">{stage}</div></div></div>{r && <Badge variant={r.status === "approved" || r.status === "completed" ? "secondary" : r.status === "needs_review" ? "destructive" : "outline"}>{r.status}</Badge>}</div>{r?.confidence != null && <div className="mt-2 text-xs text-muted-foreground">الثقة {Math.round(r.confidence * 100)}%</div>}{r?.tool_adapter && <div className="mt-1 truncate text-[10px] text-muted-foreground">{r.tool_adapter}</div>}{r?.status === "needs_review" && <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => approveM.mutate(stage)} disabled={approveM.isPending}>اعتماد المرحلة</Button>}</CardContent></Card>;
      })}
    </div>

    <Card className="shadow-card">
      <CardHeader><CardTitle>تشغيل مرحلة / Skill</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2"><Label>المهارة</Label><Select value={skillKey} onValueChange={setSkillKey}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{skillOptions.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>GLB / USDZ / WebXR URL — عند AR/VR فقط</Label><Input dir="ltr" value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://.../model.glb" /></div>
        </div>
        <div className="space-y-2"><Label>تعليمات المشروع والمقاسات</Label><Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
        {skillKey === "real_time_design_configurator" && <div className="space-y-2"><Label>Configuration JSON</Label><Textarea dir="ltr" rows={5} value={configuration} onChange={(e) => setConfiguration(e.target.value)} placeholder='{"width_mm":2800,"material":"MDF 18mm","color":"black"}' /></div>}
        <div className="rounded-xl border border-dashed p-4">
          <div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"><Upload className="h-4 w-4" />رفع صور / PDF / فيديو<input className="hidden" type="file" multiple accept="image/*,video/*,application/pdf" onChange={(e) => onFiles(e.target.files)} /></label><span className="text-xs text-muted-foreground">الفيديو يُحوّل محليًا إلى لقطات ممثلة قبل الإرسال للتحليل.</span></div>
          {attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((a, i) => <Badge key={`${a.name}-${i}`} variant="outline">{a.name}</Badge>)}</div>}
        </div>
        <Button onClick={() => runM.mutate()} disabled={runM.isPending || !activeId}><Play className="ml-2 h-4 w-4" />{runM.isPending ? "جاري تنفيذ المرحلة..." : "تشغيل عبر Cloud AI Gateway"}</Button>
        {latestResult && <div className="rounded-xl border p-4"><div className="mb-2 flex flex-wrap gap-2"><Badge>{latestResult.skillKey}</Badge><Badge variant="outline">{latestResult.stage}</Badge>{latestResult.needsReview && <Badge variant="destructive">بانتظار اعتماد</Badge>}{latestResult.confidence != null && <Badge variant="secondary">الثقة {Math.round(latestResult.confidence * 100)}%</Badge>}<Badge variant="outline">ذاكرة {latestResult.retrievedChunks ?? 0}</Badge>{latestResult.traceId && <Badge variant="outline">Trace {String(latestResult.traceId).slice(0, 8)}</Badge>}</div><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs" dir="rtl">{JSON.stringify(latestResult.result, null, 2)}</pre></div>}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle className="text-base">تكامل الأدوات السحابية</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4"><Tool name="Cloud AI Gateway" use="Skills routing + trace + approvals"/><Tool name="Vector Memory" use="Approved factory knowledge + semantic retrieval"/><Tool name="OpenAI Multimodal" use="Room/DNA/Materials/Manufacturability/QC"/><Tool name="Interior Design Studio" use="Space planning + Design AI"/><Tool name="Autodesk APS" use="CAD / Shop Drawings / CNC handoff"/><Tool name="Blender Render Engine" use="Render previews + AR/VR scene prep"/><Tool name="Smart Costing" use="BOM + Cost estimation"/><Tool name="Nesting Engine" use="Cut optimization / kerf / waste"/><Tool name="WebAR" use="GLB + USDZ true-scale placement"/><Tool name="WebXR" use="VR walkthrough / 360 scenes"/></CardContent></Card>
  </div>;
}

function Tool({ name, use }: { name: string; use: string }) { return <div className="rounded-lg border p-3"><div className="font-medium">{name}</div><div className="mt-1 text-xs text-muted-foreground">{use}</div></div>; }
function readDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file); }); }
async function extractVideoFrames(file: File, count: number): Promise<Attachment[]> {
  const url = URL.createObjectURL(file); const video = document.createElement("video"); video.src = url; video.muted = true; video.playsInline = true; video.preload = "metadata";
  await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("تعذر قراءة الفيديو")); });
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1; const out: Attachment[] = [];
  for (let i = 0; i < count; i++) { const t = Math.min(duration - 0.01, duration * ((i + 1) / (count + 1))); await seek(video, Math.max(0, t)); const scale = Math.min(1, 1280 / Math.max(1, video.videoWidth)); const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale)); canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height); out.push({ name: `${file.name}-frame-${i + 1}.jpg`, mimeType: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.84) }); }
  URL.revokeObjectURL(url); return out;
}
function seek(video: HTMLVideoElement, time: number): Promise<void> { return new Promise((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error("تعذر استخراج لقطة من الفيديو")); }; const cleanup = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); }; video.addEventListener("seeked", done, { once: true }); video.addEventListener("error", fail, { once: true }); video.currentTime = time; }); }
