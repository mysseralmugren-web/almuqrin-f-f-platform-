import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT, useTheme } from "@/lib/theme";
import { WARRANTY_STATUS, CLAIM_STATUS, PROJECT_PRIORITY } from "@/lib/projects-constants";
import { Loading, StatusChip, money, useProjectFail } from "@/components/app/projects-ui";
import { listWarranties, listClaims, createClaim, updateClaim, addServiceVisit } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/projects/service")({
  head: () => ({
    meta: [
      { title: "الضمان وخدمة ما بعد البيع · AlMugren AI Factory OS" },
      { name: "description", content: "Warranty register, service claims, technician visits and internal service cost." },
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchWarranties = useServerFn(listWarranties);
  const fetchClaims = useServerFn(listClaims);
  const addClaim = useServerFn(createClaim);
  const patchClaim = useServerFn(updateClaim);
  const addVisit = useServerFn(addServiceVisit);

  const [claim, setClaim] = useState({ warranty_id: "", category: "", priority: "normal", description: "" });
  const [visit, setVisit] = useState({ warranty_claim_id: "", performed_at: "", parts_used: "", internal_cost: "", outcome: "" });

  const warrantiesQ = useQuery({ queryKey: ["warranties"], queryFn: () => fetchWarranties({ data: {} }) });
  const claimsQ = useQuery({ queryKey: ["claims"], queryFn: () => fetchClaims({ data: {} }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["warranties"] }); qc.invalidateQueries({ queryKey: ["claims"] }); };

  const warranties: any[] = warrantiesQ.data ?? [];
  const claims: any[] = claimsQ.data ?? [];

  const mClaim = useMutation({
    mutationFn: () => {
      const w = warranties.find((x) => x.id === claim.warranty_id);
      return addClaim({ data: { warranty_id: claim.warranty_id, project_id: w?.project_id, category: claim.category || null, priority: claim.priority as any, description: claim.description } });
    },
    onSuccess: () => { toast.success(t("تم تسجيل البلاغ", "Claim logged")); setClaim({ warranty_id: "", category: "", priority: "normal", description: "" }); refresh(); },
    onError: fail,
  });
  const mPatch = useMutation({ mutationFn: (v: any) => patchClaim({ data: v }), onSuccess: refresh, onError: fail });
  const mVisit = useMutation({
    mutationFn: () => addVisit({ data: { warranty_claim_id: visit.warranty_claim_id, performed_at: visit.performed_at || null, parts_used: visit.parts_used || null, internal_cost: Number(visit.internal_cost) || 0, outcome: visit.outcome || null } }),
    onSuccess: () => { toast.success(t("تم تسجيل زيارة الصيانة", "Service visit recorded")); setVisit({ warranty_claim_id: "", performed_at: "", parts_used: "", internal_cost: "", outcome: "" }); refresh(); },
    onError: fail,
  });

  if (warrantiesQ.isLoading || claimsQ.isLoading) return <Loading />;

  return (
    <Tabs defaultValue="warranties">
      <TabsList>
        <TabsTrigger value="warranties">{t("سجل الضمانات", "Warranties")}</TabsTrigger>
        <TabsTrigger value="claims">{t("بلاغات الخدمة", "Service claims")}</TabsTrigger>
      </TabsList>

      <TabsContent value="warranties" className="mt-4">
        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم الضمان", "Warranty #")}</TableHead>
                  <TableHead>{t("المشروع", "Project")}</TableHead>
                  <TableHead>{t("النطاق", "Scope")}</TableHead>
                  <TableHead>{t("من", "From")}</TableHead>
                  <TableHead>{t("إلى", "To")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {warranties.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("لا توجد ضمانات — تصدر من محضر الاستلام النهائي", "No warranties — issued from the final handover")}</TableCell></TableRow>}
                {warranties.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium" dir="ltr">{w.warranty_number}</TableCell>
                    <TableCell>{w.projects?.project_number} — {w.projects?.name_ar}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{w.scope_ar}</TableCell>
                    <TableCell dir="ltr">{w.start_date}</TableCell>
                    <TableCell dir="ltr">{w.end_date}</TableCell>
                    <TableCell><StatusChip value={w.status} map={WARRANTY_STATUS} /></TableCell>
                    <TableCell className="text-end">
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/print/project/$kind/$id" params={{ kind: "warranty", id: w.id }}><Printer className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="claims" className="mt-4 space-y-5">
        <Card className="shadow-card">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>{t("الضمان", "Warranty")}</Label>
              <Select value={claim.warranty_id} onValueChange={(v) => setClaim({ ...claim, warranty_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر الضمان", "Select warranty")} /></SelectTrigger>
                <SelectContent>{warranties.map((w) => <SelectItem key={w.id} value={w.id}>{w.warranty_number} — {w.projects?.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("التصنيف", "Category")}</Label><Input value={claim.category} onChange={(e) => setClaim({ ...claim, category: e.target.value })} /></div>
            <div>
              <Label>{t("الأولوية", "Priority")}</Label>
              <Select value={claim.priority} onValueChange={(v) => setClaim({ ...claim, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROJECT_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea className="sm:col-span-3" rows={2} placeholder={t("وصف البلاغ", "Claim description")} value={claim.description} onChange={(e) => setClaim({ ...claim, description: e.target.value })} />
            <div className="flex items-end">
              <Button className="w-full gap-2 gradient-primary" disabled={!claim.warranty_id || !claim.description.trim()} onClick={() => mClaim.mutate()}>
                <Plus className="h-4 w-4" />{t("تسجيل بلاغ", "Log claim")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم البلاغ", "Claim #")}</TableHead>
                  <TableHead>{t("المشروع", "Project")}</TableHead>
                  <TableHead>{t("الوصف", "Description")}</TableHead>
                  <TableHead>{t("موعد الاستجابة", "SLA due")}</TableHead>
                  <TableHead>{t("مشمول بالضمان", "Covered")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("الزيارات", "Visits")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("لا توجد بلاغات", "No claims")}</TableCell></TableRow>}
                {claims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" dir="ltr">{c.claim_number}</TableCell>
                    <TableCell>{c.projects?.project_number}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{c.description}</TableCell>
                    <TableCell dir="ltr">{String(c.sla_due_at ?? "").slice(0, 16).replace("T", " ") || "—"}</TableCell>
                    <TableCell>
                      <Select value={c.is_covered === null || c.is_covered === undefined ? "unknown" : String(c.is_covered)} onValueChange={(v) => mPatch.mutate({ id: c.id, is_covered: v === "unknown" ? null : v === "true" })}>
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unknown">{t("قيد الفحص", "Under review")}</SelectItem>
                          <SelectItem value="true">{t("مشمول", "Covered")}</SelectItem>
                          <SelectItem value="false">{t("غير مشمول", "Not covered")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => mPatch.mutate({ id: c.id, status: v })}>
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(CLAIM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell dir="ltr">{(c.service_visits ?? []).length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <Label>{t("البلاغ", "Claim")}</Label>
              <Select value={visit.warranty_claim_id} onValueChange={(v) => setVisit({ ...visit, warranty_claim_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر البلاغ", "Select claim")} /></SelectTrigger>
                <SelectContent>{claims.map((c) => <SelectItem key={c.id} value={c.id}>{c.claim_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("تاريخ التنفيذ", "Performed at")}</Label><Input type="date" dir="ltr" value={visit.performed_at} onChange={(e) => setVisit({ ...visit, performed_at: e.target.value })} /></div>
            <div><Label>{t("التكلفة الداخلية", "Internal cost")}</Label><Input type="number" dir="ltr" value={visit.internal_cost} onChange={(e) => setVisit({ ...visit, internal_cost: e.target.value })} /></div>
            <div className="flex items-end">
              <Button className="w-full gap-2 gradient-primary" disabled={!visit.warranty_claim_id} onClick={() => mVisit.mutate()}><ShieldCheck className="h-4 w-4" />{t("تسجيل زيارة", "Log visit")}</Button>
            </div>
            <Textarea className="sm:col-span-3" rows={2} placeholder={t("القطع المستخدمة", "Parts used")} value={visit.parts_used} onChange={(e) => setVisit({ ...visit, parts_used: e.target.value })} />
            <Textarea className="sm:col-span-2" rows={2} placeholder={t("نتيجة الزيارة", "Outcome")} value={visit.outcome} onChange={(e) => setVisit({ ...visit, outcome: e.target.value })} />
            <div className="sm:col-span-5 text-xs text-muted-foreground">
              {t("إجمالي تكلفة الخدمة المسجلة", "Total recorded service cost")}: <span dir="ltr">{money(claims.reduce((s, c) => s + (c.service_visits ?? []).reduce((x: number, v: any) => x + Number(v.internal_cost ?? 0), 0), 0))}</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

