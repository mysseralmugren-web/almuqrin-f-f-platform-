import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPurchaseRequest, listPurchaseRequests, setPurchaseRequestStatus } from "@/lib/purchasing.functions";
import { PR_STATUS, UNITS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/")({
  head: () => ({
    meta: [
      { title: "طلبات الشراء · AlMugren AI Factory OS" },
      { name: "description", content: "Create, submit and approve purchase requests with approval limits." },
      { property: "og:title", content: "طلبات الشراء · AlMugren AI Factory OS" },
      { property: "og:description", content: "Purchase requests with submission and approval workflow." },
    ],
  }),
  component: PurchaseRequestsPage,
});

type Line = { description: string; unit: string; quantity: string; estimated_price: string; specification: string };
const emptyLine: Line = { description: "", unit: UNITS[0], quantity: "", estimated_price: "", specification: "" };

function PurchaseRequestsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchPrs = useServerFn(listPurchaseRequests);
  const addPr = useServerFn(createPurchaseRequest);
  const setStatus = useServerFn(setPurchaseRequestStatus);

  const { data: prs = [] } = useQuery({ queryKey: ["purchase-requests"], queryFn: () => fetchPrs({}) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["purchase-requests"] });

  const [open, setOpen] = useState(false);
  const [needed, setNeeded] = useState("");
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.estimated_price || 0), 0);

  const create = useMutation({
    mutationFn: () =>
      addPr({
        data: {
          needed_date: needed || null,
          justification: justification.trim() || null,
          items: lines
            .filter((l) => l.description.trim() && Number(l.quantity) > 0)
            .map((l) => ({
              description: l.description.trim(),
              unit: l.unit,
              quantity: Number(l.quantity),
              estimated_price: Number(l.estimated_price || 0),
              specification: l.specification.trim() || null,
            })),
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء طلب الشراء", "Purchase request created"));
      setLines([{ ...emptyLine }]);
      setNeeded("");
      setJustification("");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const transition = useMutation({
    mutationFn: (v: { id: string; status: "submitted" | "approved" | "rejected" | "cancelled"; rejection_reason?: string | null }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      toast.success(t("تم تحديث الحالة", "Status updated"));
      refresh();
    },
    onError: fail,
  });

  const reject = (id: string) => {
    const reason = window.prompt(t("سبب الرفض", "Rejection reason"))?.trim();
    if (!reason) return;
    transition.mutate({ id, status: "rejected", rejection_reason: reason });
  };

  const valid = lines.some((l) => l.description.trim() && Number(l.quantity) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("طلبات الشراء", "Purchase requests")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("دورة: مسودة ← مقدم ← معتمد/مرفوض ← محوّل", "Draft → submitted → approved/rejected → converted")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
          {t("طلب جديد", "New request")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("طلب شراء جديد", "New purchase request")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pr-needed">{t("تاريخ الاحتياج", "Needed date")}</Label>
                <Input id="pr-needed" type="date" value={needed} onChange={(e) => setNeeded(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-just">{t("المبرر", "Justification")}</Label>
                <Textarea id="pr-just" rows={1} value={justification} onChange={(e) => setJustification(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <Input
                    placeholder={t("الوصف", "Description")}
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                  <Input placeholder={t("الوحدة", "Unit")} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("الكمية", "Qty")}
                    value={l.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("سعر تقديري", "Est. price")}
                    value={l.estimated_price}
                    onChange={(e) => setLine(i, { estimated_price: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}>
                <Plus className="h-4 w-4" />
                {t("إضافة بند", "Add line")}
              </Button>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                {t("الإجمالي التقديري", "Estimated total")}: <span className="font-semibold text-foreground">{money(total)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("إلغاء", "Cancel")}
                </Button>
                <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
                  {t("حفظ كمسودة", "Save draft")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(prs as any[]).length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t("لا توجد طلبات شراء", "No purchase requests")}
          hint={t("أنشئ طلب شراء يدويًا أو من نقص مواد أمر التصنيع.", "Create one manually or from a manufacturing order shortfall.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("تاريخ الاحتياج", "Needed")}</TableHead>
                  <TableHead>{t("البنود", "Lines")}</TableHead>
                  <TableHead>{t("الإجمالي التقديري", "Estimated")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(prs as any[]).map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-xs">{pr.pr_number}</TableCell>
                    <TableCell>{pr.needed_date ?? "—"}</TableCell>
                    <TableCell>{pr.purchase_request_items?.length ?? 0}</TableCell>
                    <TableCell>{money(pr.estimated_total)}</TableCell>
                    <TableCell>
                      <StatusPill status={pr.status} labels={PR_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {pr.status === "draft" ? (
                          <Button size="sm" onClick={() => transition.mutate({ id: pr.id, status: "submitted" })}>
                            {t("تقديم", "Submit")}
                          </Button>
                        ) : null}
                        {pr.status === "submitted" ? (
                          <>
                            <Button size="sm" onClick={() => transition.mutate({ id: pr.id, status: "approved" })}>
                              {t("اعتماد", "Approve")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reject(pr.id)}>
                              {t("رفض", "Reject")}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

