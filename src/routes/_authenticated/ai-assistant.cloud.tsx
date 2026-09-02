import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cloud, Database, BrainCircuit, Activity, RefreshCw, ShieldCheck, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/ai-assistant/cloud")({
  head: () => ({ meta: [{ title: "Cloud AI Ops · منصة المقرن" }] }),
  component: CloudAiOps,
});

type Env = { id: string; environment: string; is_active: boolean; is_default: boolean; config: any };
type GatewayRun = { id: string; skill_key: string; status: string; trace_id: string; confidence: number | null; latency_ms: number | null; approval_required: boolean; created_at: string };
type KnowledgeDoc = { id: string; title: string; approved: boolean; content: string | null; updated_at: string };

function CloudAiOps() {
  const qc = useQueryClient();
  const envQ = useQuery({
    queryKey: ["cloud-runtime-environments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("cloud_runtime_environments").select("id,environment,is_active,is_default,config").order("environment");
      if (error) throw error;
      return (data ?? []) as Env[];
    },
  });

  const runsQ = useQuery({
    queryKey: ["ai-gateway-runs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ai_gateway_runs").select("id,skill_key,status,trace_id,confidence,latency_ms,approval_required,created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as GatewayRun[];
    },
    refetchInterval: 15000,
  });

  const memoryQ = useQuery({
    queryKey: ["ai-vector-memory-count"],
    queryFn: async () => {
      const [{ count: chunks, error: chunksError }, { count: approved, error: approvedError }] = await Promise.all([
        (supabase as any).from("ai_knowledge_chunks").select("id", { count: "exact", head: true }).eq("active", true),
        (supabase as any).from("ai_knowledge_chunks").select("id", { count: "exact", head: true }).eq("active", true).eq("approved", true),
      ]);
      if (chunksError) throw chunksError;
      if (approvedError) throw approvedError;
      return { chunks: chunks ?? 0, approved: approved ?? 0 };
    },
  });

  const docsQ = useQuery({
    queryKey: ["ai-knowledge-documents-cloud"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ai_knowledge_documents").select("id,title,approved,content,updated_at").order("updated_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as KnowledgeDoc[];
    },
  });

  const ingestM = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("knowledge-ingestion", { body: { documentId } });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success(`تمت فهرسة ${data?.chunks ?? 0} مقطع في Vector Memory`);
      await qc.invalidateQueries({ queryKey: ["ai-vector-memory-count"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذرت فهرسة المعرفة"),
  });

  const runs = runsQ.data ?? [];
  const completed = runs.filter((r) => r.status === "completed" || r.status === "needs_review").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const avgLatency = runs.filter((r) => r.latency_ms != null).length
    ? Math.round(runs.filter((r) => r.latency_ms != null).reduce((s, r) => s + Number(r.latency_ms), 0) / runs.filter((r) => r.latency_ms != null).length)
    : 0;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Cloud className="h-6 w-6" />Cloud AI Operations</h2>
        <p className="mt-1 text-sm text-muted-foreground">مراقبة بوابة الذكاء، الذاكرة السحابية، التتبع، والبيئات التشغيلية.</p>
      </div>
      <Button variant="outline" onClick={() => Promise.all([runsQ.refetch(), memoryQ.refetch(), envQ.refetch()])}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={BrainCircuit} title="AI Gateway" value={`${completed}/${runs.length}`} note={`فشل ${failed}`} />
      <Metric icon={Database} title="Vector Memory" value={String(memoryQ.data?.approved ?? 0)} note={`${memoryQ.data?.chunks ?? 0} مقطع إجمالي`} />
      <Metric icon={Gauge} title="متوسط زمن AI" value={avgLatency ? `${(avgLatency / 1000).toFixed(1)}s` : "—"} note="آخر 30 تشغيل" />
      <Metric icon={ShieldCheck} title="Human Approval" value={String(runs.filter((r) => r.approval_required).length)} note="تشغيلات حساسة" />
    </div>

    <Card>
      <CardHeader><CardTitle className="text-base">بيئات التشغيل</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {(envQ.data ?? []).map((e) => <div key={e.id} className="rounded-xl border p-4"><div className="flex items-center justify-between"><div className="font-semibold capitalize">{e.environment}</div><Badge variant={e.is_active ? "secondary" : "outline"}>{e.is_active ? "Active" : "Disabled"}</Badge></div><div className="mt-2 text-xs text-muted-foreground">{e.is_default ? "البيئة الافتراضية" : "بيئة غير افتراضية"}</div><div className="mt-1 text-[11px] text-muted-foreground">{e.config?.region ?? "—"} · {e.config?.timezone ?? "—"}</div></div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />آخر تشغيلات AI Gateway</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {runs.length === 0 && <div className="text-sm text-muted-foreground">لا توجد تشغيلات عبر البوابة حتى الآن.</div>}
        {runs.map((r) => <div key={r.id} className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-[1.5fr_.8fr_1fr_.8fr] md:items-center"><div><div className="font-medium">{r.skill_key}</div><div className="text-[11px] text-muted-foreground">Trace {r.trace_id?.slice(0, 12)}</div></div><Badge variant={r.status === "failed" ? "destructive" : r.status === "needs_review" ? "outline" : "secondary"}>{r.status}</Badge><div className="text-xs text-muted-foreground">{r.latency_ms == null ? "—" : `${(r.latency_ms / 1000).toFixed(1)}s`}</div><div className="text-xs text-muted-foreground">{r.confidence == null ? "—" : `${Math.round(r.confidence * 100)}%`}</div></div>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base">قاعدة معرفة المصنع → Vector Memory</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {(docsQ.data ?? []).length === 0 && <div className="text-sm text-muted-foreground">لا توجد مستندات معرفة.</div>}
        {(docsQ.data ?? []).map((d) => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><div className="text-sm font-medium">{d.title}</div><div className="mt-1 flex gap-2"><Badge variant={d.approved ? "secondary" : "outline"}>{d.approved ? "معتمد" : "غير معتمد"}</Badge><Badge variant="outline">{d.content?.trim() ? "نص جاهز" : "بدون نص"}</Badge></div></div><Button size="sm" variant="outline" disabled={!d.approved || !d.content?.trim() || ingestM.isPending} onClick={() => ingestM.mutate(d.id)}><Database className="ml-2 h-4 w-4" />فهرسة للذاكرة</Button></div>)}
      </CardContent>
    </Card>

    <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">ملاحظة معمارية: Development / Staging / Production المعروضة هنا هي طبقة Runtime منطقية داخل المشروع الحالي. الفصل الفيزيائي الكامل لثلاث قواعد Supabase مستقلة يتم في مرحلة العزل البيئي ولا يُنفّذ تلقائيًا إذا كان سيترتب عليه تكلفة إضافية.</div>
  </div>;
}

function Metric({ icon: Icon, title, value, note }: { icon: any; title: string; value: string; note: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 text-2xl font-bold">{value}</div><div className="mt-1 text-[11px] text-muted-foreground">{note}</div></div><Icon className="h-6 w-6 text-muted-foreground" /></div></CardContent></Card>;
}
