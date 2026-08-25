import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPostableDocuments, postDocument, postAllPending } from "@/lib/accounting.functions";
import { SOURCE_LABELS } from "@/lib/accounting-constants";
import { EmptyState } from "@/components/app/purchasing-ui";
import { money, useAccFail } from "@/components/app/accounting-ui";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/posting")({
  head: () => ({
    meta: [
      { title: "الترحيل الآلي · AlMugren AI Factory OS" },
      { name: "description", content: "Idempotent posting of invoices, payments, supplier documents and stock movements to the ledger." },
      { property: "og:title", content: "الترحيل الآلي · AlMugren AI Factory OS" },
      { property: "og:description", content: "Idempotent document posting to the general ledger." },
    ],
  }),
  component: PostingPage,
});

function PostingPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAccFail();
  const qc = useQueryClient();

  const fetchPending = useServerFn(listPostableDocuments);
  const postOne = useServerFn(postDocument);
  const postAll = useServerFn(postAllPending);

  const { data: pending = [], isLoading } = useQuery({ queryKey: ["postable"], queryFn: () => fetchPending({}) });
  const rows = pending as any[];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["postable"] });
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  const oneMut = useMutation({
    mutationFn: (v: { source_type: string; source_id: string }) => postOne({ data: v as any }),
    onSuccess: () => { toast.success(t("تم ترحيل المستند", "Document posted")); refresh(); },
    onError: fail,
  });
  const allMut = useMutation({
    mutationFn: () => postAll({}),
    onSuccess: (r: any) => {
      toast.success(t(`تم ترحيل ${r.posted} مستندًا`, `${r.posted} documents posted`));
      if (r.failures?.length) toast.warning(t(`${r.failures.length} مستندًا لم يُرحّل`, `${r.failures.length} documents skipped`));
      refresh();
    },
    onError: fail,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          {t("مستندات جاهزة للترحيل", "Documents awaiting posting")}
          {rows.length ? <Badge variant="secondary" className="border-0">{rows.length}</Badge> : null}
        </CardTitle>
        <Button size="sm" onClick={() => allMut.mutate()} disabled={allMut.isPending || rows.length === 0}>
          <PlayCircle className="h-4 w-4" />
          {t("ترحيل الكل", "Post all")}
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Calculator className="h-6 w-6" />}
            title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد مستندات بانتظار الترحيل", "Nothing awaiting posting")}
            hint={t("يظهر هنا كل مستند معتمد لم يُرحّل بعد، ولا يمكن ترحيله مرتين", "Approved documents appear here once, and can never post twice")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("نوع المستند", "Type")}</TableHead><TableHead>{t("المرجع", "Reference")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead><TableHead className="text-end">{t("المبلغ", "Amount")}</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.source_type}-${r.source_id}`}>
                    <TableCell>{SOURCE_LABELS[r.source_type] ? (ar ? SOURCE_LABELS[r.source_type]!.ar : SOURCE_LABELS[r.source_type]!.en) : r.source_type}</TableCell>
                    <TableCell className="font-mono text-xs">{r.label}</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(r.amount)}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="outline" disabled={oneMut.isPending}
                        onClick={() => oneMut.mutate({ source_type: r.source_type, source_id: r.source_id })}>
                        {t("ترحيل", "Post")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

