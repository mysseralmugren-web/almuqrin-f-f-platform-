import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GitCompare, Plus, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { awardRfq, createRfq, listPurchaseRequests, listRfqs, listSuppliers, saveRfqQuote } from "@/lib/purchasing.functions";
import { RFQ_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/rfq")({
  head: () => ({
    meta: [
      { title: "عروض الموردين · AlMugren AI Factory OS" },
      { name: "description", content: "Request quotations from suppliers and compare price, VAT, lead time, terms and quality." },
      { property: "og:title", content: "عروض الموردين · AlMugren AI Factory OS" },
      { property: "og:description", content: "RFQ creation and documented award decisions." },
    ],
  }),
  component: RfqPage,
});

function RfqPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchRfqs = useServerFn(listRfqs);
  const fetchSuppliers = useServerFn(listSuppliers);
  const fetchPrs = useServerFn(listPurchaseRequests);
  const addRfq = useServerFn(createRfq);
  const saveQuote = useServerFn(saveRfqQuote);
  const award = useServerFn(awardRfq);

  const { data: rfqs = [] } = useQuery({ queryKey: ["rfqs"], queryFn: () => fetchRfqs({}) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers({}) });
  const { data: prs = [] } = useQuery({ queryKey: ["purchase-requests"], queryFn: () => fetchPrs({}) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["rfqs"] });

  const [open, setOpen] = useState(false);
  const [prId, setPrId] = useState("");
  const [due, setDue] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [quote, setQuote] = useState<Record<string, { subtotal: string; lead: string; terms: string; quality: string }>>({});

  const create = useMutation({
    mutationFn: () =>
      addRfq({ data: { purchase_request_id: prId || null, due_date: due || null, supplier_ids: picked, notes: null } }),
    onSuccess: () => {
      toast.success(t("تم إنشاء طلب عروض", "RFQ created"));
      setPicked([]);
      setPrId("");
      setDue("");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const submitQuote = useMutation({
    mutationFn: (id: string) => {
      const q = quote[id] ?? { subtotal: "0", lead: "", terms: "", quality: "" };
      return saveQuote({
        data: {
          rfq_supplier_id: id,
          subtotal: Number(q.subtotal || 0),
          vat_rate: 15,
          lead_time_days: q.lead ? Number(q.lead) : null,
          payment_terms_days: q.terms ? Number(q.terms) : null,
          quality_score: q.quality ? Number(q.quality) : null,
          notes: null,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("تم حفظ العرض", "Quote saved"));
      refresh();
    },
    onError: fail,
  });

  const doAward = useMutation({
    mutationFn: (v: { rfq_supplier_id: string; award_reason: string }) => award({ data: v }),
    onSuccess: () => {
      toast.success(t("تمت الترسية", "Awarded"));
      refresh();
    },
    onError: fail,
  });

  const approvedPrs = (prs as any[]).filter((p) => p.status === "approved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("طلبات عروض الموردين", "Requests for quotation")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("قارن السعر والضريبة والمدة وشروط الدفع والجودة قبل الترسية", "Compare price, VAT, lead time, terms and quality")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={(suppliers as any[]).length === 0}>
          <Plus className="h-4 w-4" />
          {t("طلب عروض", "New RFQ")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("طلب عروض جديد", "New RFQ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rfq-pr">{t("طلب الشراء المعتمد (اختياري)", "Approved PR (optional)")}</Label>
                <select
                  id="rfq-pr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={prId}
                  onChange={(e) => setPrId(e.target.value)}
                >
                  <option value="">—</option>
                  {approvedPrs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.pr_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfq-due">{t("آخر موعد للعروض", "Due date")}</Label>
                <Input id="rfq-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("الموردون المدعوون", "Invited suppliers")}</Label>
              <div className="flex flex-wrap gap-2">
                {(suppliers as any[]).map((s) => {
                  const on = picked.includes(s.id);
                  return (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                    >
                      {s.name_ar}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled={picked.length === 0 || create.isPending} onClick={() => create.mutate()}>
                {t("إنشاء", "Create")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(rfqs as any[]).length === 0 ? (
        <EmptyState
          icon={<GitCompare className="h-6 w-6" />}
          title={t("لا توجد طلبات عروض", "No RFQs yet")}
          hint={t("ادعُ موردين لتقديم عروضهم ثم قارنها.", "Invite suppliers to quote and compare their offers.")}
        />
      ) : (
        (rfqs as any[]).map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-3 text-base">
                <span className="font-mono text-xs">{r.rfq_number}</span>
                <StatusPill status={r.status} labels={RFQ_STATUS} />
                {r.purchase_requests?.pr_number ? (
                  <span className="text-xs text-muted-foreground">{r.purchase_requests.pr_number}</span>
                ) : null}
              </CardTitle>
              {r.award_reason ? <span className="text-xs text-muted-foreground">{r.award_reason}</span> : null}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المورد", "Supplier")}</TableHead>
                    <TableHead>{t("الإجمالي قبل الضريبة", "Subtotal")}</TableHead>
                    <TableHead>{t("الضريبة", "VAT")}</TableHead>
                    <TableHead>{t("الإجمالي", "Total")}</TableHead>
                    <TableHead>{t("مدة التوريد", "Lead")}</TableHead>
                    <TableHead>{t("السداد", "Terms")}</TableHead>
                    <TableHead>{t("الجودة", "Quality")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(r.rfq_suppliers ?? []).map((q: any) => (
                    <TableRow key={q.id} className={q.is_awarded ? "bg-accent/10" : undefined}>
                      <TableCell className="font-medium">{q.suppliers?.name_ar}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-28"
                          type="number"
                          min="0"
                          defaultValue={q.subtotal ?? ""}
                          onChange={(e) => setQuote((s) => ({ ...s, [q.id]: { ...(s[q.id] ?? { subtotal: "", lead: "", terms: "", quality: "" }), subtotal: e.target.value } }))}
                        />
                      </TableCell>
                      <TableCell>{money(q.vat_amount)}</TableCell>
                      <TableCell className="font-semibold">{money(q.total)}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-20"
                          type="number"
                          min="0"
                          defaultValue={q.lead_time_days ?? ""}
                          onChange={(e) => setQuote((s) => ({ ...s, [q.id]: { ...(s[q.id] ?? { subtotal: "", lead: "", terms: "", quality: "" }), lead: e.target.value } }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-20"
                          type="number"
                          min="0"
                          defaultValue={q.payment_terms_days ?? q.suppliers?.payment_terms_days ?? ""}
                          onChange={(e) => setQuote((s) => ({ ...s, [q.id]: { ...(s[q.id] ?? { subtotal: "", lead: "", terms: "", quality: "" }), terms: e.target.value } }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-20"
                          type="number"
                          min="0"
                          max="10"
                          defaultValue={q.quality_score ?? ""}
                          onChange={(e) => setQuote((s) => ({ ...s, [q.id]: { ...(s[q.id] ?? { subtotal: "", lead: "", terms: "", quality: "" }), quality: e.target.value } }))}
                        />
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => submitQuote.mutate(q.id)}>
                            {t("حفظ العرض", "Save")}
                          </Button>
                          {r.status !== "awarded" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const reason = window.prompt(t("مبرر الترسية", "Award reason"))?.trim();
                                if (!reason || reason.length < 5) return;
                                doAward.mutate({ rfq_supplier_id: q.id, award_reason: reason });
                              }}
                            >
                              <Award className="h-4 w-4" />
                              {t("ترسية", "Award")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

