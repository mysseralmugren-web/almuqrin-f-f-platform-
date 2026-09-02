import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BrainCircuit, Play, ShieldCheck, Activity, Factory, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getAiAccess } from "@/lib/ai.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/ai-assistant/skills")({
  head: () => ({ meta: [{ title: "مهارات التوأم الرقمي · منصة المقرن" }] }),
  component: DigitalTwinSkills,
});

type Skill = {
  setting_id: string;
  skill_key: string;
  name_ar: string;
  name_en: string;
  category: string;
  description_ar: string;
  description_en: string;
  risk_level: "low" | "medium" | "high" | "critical";
  requires_human_approval: boolean;
  enabled: boolean;
  autonomy_level: "assist" | "recommend" | "execute_with_approval" | "execute";
  confidence_threshold: number;
  max_daily_runs: number;
  input_types: string[];
  output_types: string[];
};

const categoryAr: Record<string, string> = {
  core_ai: "الذكاء العام",
  design: "التصميم",
  manufacturing: "التصنيع",
  commercial: "المبيعات والمتجر",
  finance: "المالية",
  digital_twin: "التوأم الرقمي",
};
const riskAr = { low: "منخفض", medium: "متوسط", high: "مرتفع", critical: "حساس" } as const;
const autonomyAr = {
  assist: "مساعد فقط",
  recommend: "توصية",
  execute_with_approval: "تنفيذ بعد اعتماد",
  execute: "تنفيذ تلقائي منخفض المخاطر",
} as const;

function DigitalTwinSkills() {
  const t = useT();
  const qc = useQueryClient();
  const getAccess = useServerFn(getAiAccess);
  const accessQ = useQuery({ queryKey: ["ai-access"], queryFn: () => getAccess() });
  const skillsQ = useQuery({
    queryKey: ["ai-twin-skills"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ai_twin_skills_effective").select("*").order("category").order("name_ar");
      if (error) throw error;
      return (data ?? []) as Skill[];
    },
  });
  const [local, setLocal] = useState<Record<string, Skill>>({});
  const [selected, setSelected] = useState<string>("");
  const [prompt, setPrompt] = useState("حلل حالة المصنع الحالية باستخدام هذه المهارة واذكر الملاحظات والمخاطر والإجراء المقترح.");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!skillsQ.data) return;
    const map: Record<string, Skill> = {};
    for (const s of skillsQ.data) map[s.skill_key] = s;
    setLocal(map);
    if (!selected && skillsQ.data[0]) setSelected(skillsQ.data[0].skill_key);
  }, [skillsQ.data]);

  const canEdit = !!accessQ.data?.isAdmin;
  const skills = useMemo(() => Object.values(local), [local]);
  const twinCount = skills.filter((s) => s.category === "digital_twin").length;
  const enabledCount = skills.filter((s) => s.enabled).length;
  const approvalCount = skills.filter((s) => s.requires_human_approval).length;

  const saveM = useMutation({
    mutationFn: async (s: Skill) => {
      const { error } = await (supabase as any).from("ai_twin_skill_settings").update({
        enabled: s.enabled,
        autonomy_level: s.autonomy_level,
        confidence_threshold: Number(s.confidence_threshold),
        max_daily_runs: Number(s.max_daily_runs),
        updated_at: new Date().toISOString(),
      }).eq("id", s.setting_id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("تم حفظ إعداد المهارة"); await qc.invalidateQueries({ queryKey: ["ai-twin-skills"] }); },
    onError: (e: any) => toast.error(e?.message ?? "تعذر حفظ المهارة"),
  });

  const runM = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("اختر مهارة");
      const { data, error } = await supabase.functions.invoke("ai-digital-twin", { body: { skillKey: selected, prompt } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { setResult(data); toast.success(data?.needsReview ? "اكتمل التحليل — بانتظار المراجعة" : "اكتمل تشغيل المهارة"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل تشغيل المهارة"),
  });

  if (skillsQ.isLoading) return <div className="p-8 text-sm text-muted-foreground">جاري تحميل مهارات الموظف الذكي...</div>;
  if (skillsQ.error) return <div className="p-8 text-sm text-destructive">تعذر تحميل المهارات.</div>;

  return <div className="space-y-6">
    <div className="grid gap-3 md:grid-cols-4">
      <Stat icon={BrainCircuit} label="إجمالي المهارات" value={skills.length} />
      <Stat icon={Factory} label="مهارات التوأم الرقمي" value={twinCount} />
      <Stat icon={Activity} label="المفعّل" value={enabledCount} />
      <Stat icon={ShieldCheck} label="تحتاج اعتمادًا" value={approvalCount} />
    </div>

    <Card className="shadow-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" />{t("مهارات الموظف الذكي والتوأم الرقمي", "AI employee & digital twin skills")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
          التوأم الرقمي يقرأ بيانات المصنع الحية ويُنشئ تحليلًا أو محاكاة فقط. المهارات الحساسة لا تعتمد سعرًا نهائيًا، ولا تمرر قيدًا محاسبيًا، ولا تنشر منتجًا، ولا تجيز فحص جودة بدون اعتماد بشري.
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {skills.map((s) => <SkillCard key={s.skill_key} skill={s} canEdit={canEdit} onChange={(next) => setLocal((cur) => ({ ...cur, [next.skill_key]: next }))} onSave={() => saveM.mutate(s)} saving={saveM.isPending} />)}
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />تشغيل مهارة على التوأم الرقمي</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <div className="space-y-2"><Label>المهارة</Label><Select value={selected} onValueChange={setSelected}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{skills.filter(s=>s.enabled).map(s=><SelectItem key={s.skill_key} value={s.skill_key}>{s.name_ar}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>التوجيه</Label><Textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={3} /></div>
        </div>
        <Button onClick={()=>runM.mutate()} disabled={runM.isPending || !selected}><Play className="ml-2 h-4 w-4" />{runM.isPending ? "جاري تشغيل التوأم الرقمي..." : "تشغيل المهارة"}</Button>
        {result && <div className="rounded-xl border p-4 text-sm"><div className="mb-2 flex flex-wrap gap-2"><Badge>{result.skillKey}</Badge><Badge variant="outline">الثقة {Math.round(Number(result.confidence ?? 0)*100)}%</Badge>{result.needsReview && <Badge variant="destructive">بانتظار اعتماد</Badge>}</div><pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs" dir="rtl">{JSON.stringify(result.result, null, 2)}</pre></div>}
      </CardContent>
    </Card>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-muted p-2"><Icon className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></CardContent></Card>;
}

function SkillCard({ skill, canEdit, onChange, onSave, saving }: { skill: Skill; canEdit: boolean; onChange: (s: Skill)=>void; onSave: ()=>void; saving: boolean }) {
  const highRisk = skill.risk_level === "high" || skill.risk_level === "critical";
  return <div className="rounded-xl border p-4">
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{skill.name_ar}</h3><Badge variant="outline">{categoryAr[skill.category] ?? skill.category}</Badge><Badge variant={highRisk ? "destructive" : "secondary"}>{riskAr[skill.risk_level]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{skill.description_ar}</p><code className="mt-1 block text-[10px] text-muted-foreground">{skill.skill_key}</code></div><Switch checked={skill.enabled} onCheckedChange={(v)=>onChange({...skill,enabled:v})} disabled={!canEdit}/></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label className="text-xs">الاستقلالية</Label><Select value={skill.autonomy_level} onValueChange={(v)=>onChange({...skill,autonomy_level:v as Skill['autonomy_level']})} disabled={!canEdit || skill.risk_level === 'critical'}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(autonomyAr).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className="text-xs">حد الثقة</Label><Input className="h-9" type="number" min="0" max="1" step="0.05" value={skill.confidence_threshold} onChange={(e)=>onChange({...skill,confidence_threshold:Number(e.target.value)})} disabled={!canEdit}/></div>
      <div className="space-y-1"><Label className="text-xs">الحد اليومي</Label><Input className="h-9" type="number" min="1" value={skill.max_daily_runs} onChange={(e)=>onChange({...skill,max_daily_runs:Number(e.target.value)})} disabled={!canEdit}/></div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">{skill.requires_human_approval && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />اعتماد بشري إلزامي</span>}<span>مدخلات: {skill.input_types?.join("، ") || "—"}</span></div>
    {canEdit && <div className="mt-3"><Button size="sm" variant="outline" onClick={onSave} disabled={saving}>حفظ المهارة</Button></div>}
  </div>;
}
