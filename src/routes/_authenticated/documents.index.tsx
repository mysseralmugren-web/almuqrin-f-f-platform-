import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, Printer, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  buildDocument, getDocumentsAccess, listDocumentSources, listGeneratedDocuments,
} from "@/lib/documents.functions";
import { DOC_KIND_LABEL, DOC_STATUSES, DOC_STATUS_LABEL, type DocKind } from "@/lib/documents-constants";
import { money, StatusBadge, useAr, useDocFail } from "@/components/app/documents-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({
    meta: [
      { title: "سجل الوثائق الصادرة · AlMugren AI Factory OS" },
      { name: "description", content: "Immutable snapshots of every issued document with numbering and audit trail." },
    ],
  }),
  component: DocumentsRegister,
});

function DocumentsRegister() {
  const t = useT();
  const ar = useAr();
  const fail = useDocFail();
  const qc = useQueryClient();

  const access = useServerFn(getDocumentsAccess);
  const listDocs = useServerFn(listGeneratedDocuments);
  const listSources = useServerFn(listDocumentSources);
  const build = useServerFn(buildDocument);

  const [kind, setKind] = useState<DocKind | "">("");
  const [status, setStatus] = useState<string>("");
  const [sourceId, setSourceId] = useState("");

  const { data: acc } = useQuery({ queryKey: ["docs-access"], queryFn: () => access({}) });
  const { data: docs = [] } = useQuery({
    queryKey: ["generated-docs", status],
    queryFn: () => listDocs({ data: status ? { status: status as never } : {} }),
  });
  const { data: sources = [] } = useQuery({
    queryKey: ["doc-sources", kind],
    queryFn: () => listSources({ data: { kind: kind as DocKind } }),
    enabled: Boolean(kind),
  });

  const create = useMutation({
    mutationFn: () => build({ data: { kind: kind as DocKind, entity_id: sourceId } }),
    onSuccess: () => {
      toast.success(t("تم إنشاء مسودة الوثيقة", "Document draft created"));
      setSourceId("");
      void qc.invalidateQueries({ queryKey: ["generated-docs"] });
    },
    onError: fail,
  });

  const kinds = (acc?.kinds ?? []) as DocKind[];

  return (
    <div className="space-y-6">
      {acc && !acc.invoice_ready && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {t(
            "بيانات المنشأة أو اعتماد الهوية غير مكتمل — إصدار الفواتير الضريبية موقوف حتى الاكتمال والاعتماد.",
            "Company data or identity approval is incomplete — tax invoice issuing is blocked until both are complete.",
          )}
        </div>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("إنشاء وثيقة من سجل قائم", "Build a document from an existing record")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("نوع الوثيقة", "Document kind")}</Label>
            <Select value={kind} onValueChange={(v) => { setKind(v as DocKind); setSourceId(""); }}>
              <SelectTrigger><SelectValue placeholder={t("اختر النوع", "Select kind")} /></SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem key={k} value={k}>{ar ? DOC_KIND_LABEL[k].ar : DOC_KIND_LABEL[k].en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("السجل المصدر", "Source record")}</Label>
            <Select value={sourceId} onValueChange={setSourceId} disabled={!kind}>
              <SelectTrigger><SelectValue placeholder={t("اختر السجل", "Select record")} /></SelectTrigger>
              <SelectContent>
                {sources.map((s: { id: string; label: string; date: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.label} — {String(s.date ?? "").slice(0, 10)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="gap-2 gradient-primary font-semibold"
              disabled={!kind || !sourceId || create.isPending}
              onClick={() => create.mutate()}
            >
              <FilePlus2 className="h-4 w-4" />
              {t("إنشاء مسودة", "Create draft")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{t("سجل الوثائق", "Document register")}</CardTitle>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل الحالات", "All statuses")}</SelectItem>
              {DOC_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ar ? DOC_STATUS_LABEL[s].ar : DOC_STATUS_LABEL[s].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم الوثيقة", "Document #")}</TableHead>
                <TableHead>{t("النوع", "Kind")}</TableHead>
                <TableHead>{t("المرجع", "Source ref")}</TableHead>
                <TableHead>{t("الطرف", "Party")}</TableHead>
                <TableHead>{t("الإجمالي", "Total")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {t("لا توجد وثائق بعد", "No documents yet")}
                  </TableCell>
                </TableRow>
              )}
              {docs.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium" dir="ltr">
                    {d.doc_number ?? "—"}{d.revision > 1 ? ` · rev ${d.revision}` : ""}
                  </TableCell>
                  <TableCell>{ar ? DOC_KIND_LABEL[d.kind as DocKind].ar : DOC_KIND_LABEL[d.kind as DocKind].en}</TableCell>
                  <TableCell dir="ltr">{d.source_number ?? "—"}</TableCell>
                  <TableCell>{d.party_name ?? "—"}</TableCell>
                  <TableCell dir="ltr">{d.total == null ? "—" : money(d.total)}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-end">
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <Link to="/documents/$id" params={{ id: d.id }}>
                        <Printer className="h-4 w-4" />
                        {t("عرض وطباعة", "Open")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
