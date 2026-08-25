import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { AiChip, AiLoading, newIdempotencyKey, useAiFail } from "@/components/app/ai-ui";
import { createDesignBrief, listDesignBriefs, setDesignBriefStatus, getAiSettings } from "@/lib/ai.functions";
import { listCustomers } from "@/lib/workflow.functions";
import { listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/design")({
  head: () => ({
    meta: [
      { title: "تصميم ديزاين · AlMugren AI Factory OS" },
      { name: "description", content: "Design brief skill producing reviewable furniture concepts linked to a project, customer or quotation." },
    ],
  }),
  component: DesignSkill,
});

function DesignSkill() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAiFail();
  const qc = useQueryClient();

  const create = useServerFn(createDesignBrief);
  const list = useServerFn(listDesignBriefs);
  const setStatus = useServerFn(setDesignBriefStatus);
  const fetchSettings = useServerFn(getAiSettings);
  const fetchCustomers = useServerFn(listCustomers);
  const fetchProjects = useServerFn(listProjects);

  const briefsQ = useQuery({ queryKey: ["ai-briefs"], queryFn: () => list() });
  const settingsQ = useQuery({ queryKey: ["ai-settings"], queryFn: () => fetchSettings() });
  const customersQ = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects({ data: {} }) });

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [style, setStyle] = useState("");
  const [background, setBackground] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [withImage, setWithImage] = useState(true);

  const palette = [settingsQ.data?.brand_primary, settingsQ.data?.brand_secondary].filter(Boolean) as string[];

  const mCreate = useMutation({
    mutationFn: () =>
      create({
        data: {
          title, brief, style: style || null, background: background || null, palette,
          customer_id: customerId || null, project_id: projectId || null, quotation_id: null,
          with_image: withImage, idempotency_key: newIdempotencyKey("design"),
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء مقترح التصميم كمسودة", "Design concept created as a draft"));
      setTitle(""); setBrief(""); setStyle(""); setBackground("");
      qc.invalidateQueries({ queryKey: ["ai-briefs"] });
      qc.invalidateQueries({ queryKey: ["ai-jobs"] });
    },
    onError: fail,
  });

  const mStatus = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-briefs"] }),
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" />{t("موجز تصميم جديد", "New design brief")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("العنوان", "Title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label>{t("النمط", "Style")}</Label>
            <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder={t("مثال: نيوكلاسيك، مودرن", "e.g. neo-classic, modern")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("الموجز", "Brief")}</Label>
            <Textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={4000} />
          </div>
          <div className="space-y-2">
            <Label>{t("الخلفية", "Background")}</Label>
            <Input value={background} onChange={(e) => setBackground(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>{t("العميل (اختياري)", "Customer (optional)")}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder={t("بدون", "None")} /></SelectTrigger>
              <SelectContent>{(customersQ.data ?? []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name_ar ?? c.name_en}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("المشروع (اختياري)", "Project (optional)")}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder={t("بدون", "None")} /></SelectTrigger>
              <SelectContent>{(projectsQ.data ?? []).map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name_ar ?? p.project_number}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={withImage} onCheckedChange={setWithImage} id="with-image" />
            <Label htmlFor="with-image">{t("توليد صور مفاهيمية", "Generate concept images")}</Label>
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {t("ألوان الهوية", "Brand palette")}:
              {palette.map((c) => (<span key={c} className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: c }} />))}
            </div>
            <Button onClick={() => mCreate.mutate()} disabled={mCreate.isPending || title.length < 2 || brief.length < 10}>
              {mCreate.isPending ? t("جارٍ التوليد…", "Generating…") : t("توليد المقترح", "Generate concept")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("الصور الناتجة تُحفظ كملفات جديدة ولا تستبدل أي ملف أصلي.", "Generated images are stored as new files and never replace original uploads.")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("المقترحات", "Concepts")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {briefsQ.isLoading && <AiLoading />}
          {(briefsQ.data ?? []).length === 0 && !briefsQ.isLoading && (
            <p className="text-sm text-muted-foreground">{t("لا توجد مقترحات بعد", "No concepts yet")}</p>
          )}
          {(briefsQ.data ?? []).map((b: any) => (
            <div key={b.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.style ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <AiChip value={b.status} label={b.status === "approved" ? t("معتمد", "Approved") : b.status === "rejected" ? t("مرفوض", "Rejected") : t("مسودة", "Draft")} />
                  {b.job_id && <Link to="/ai-assistant/$id" params={{ id: b.job_id }} className="text-xs text-primary hover:underline">{t("عرض النتيجة", "View result")}</Link>}
                  {b.status === "draft" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => mStatus.mutate({ id: b.id, status: "approved" })}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => mStatus.mutate({ id: b.id, status: "rejected" })}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground" dir="auto">{b.brief}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

