import { createFileRoute } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPI_CATALOG } from "@/lib/analytics-constants";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/reports/definitions")({
  head: () => ({
    meta: [
      { title: "تعريف مؤشرات الأداء · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Central KPI catalogue: name, formula, data source, refresh cadence and required permission." },
      { property: "og:title", content: "تعريف مؤشرات الأداء · AlMugren AI Factory OS" },
      { property: "og:description", content: "Single source of truth for every KPI definition." },
    ],
  }),
  component: DefinitionsPage,
});

const SCOPE_AR: Record<string, string> = {
  executive: "تنفيذي", sales: "المبيعات", manufacturing: "التصنيع", inventory: "المخزون",
  purchasing: "المشتريات", finance: "المالية", hr: "الموارد البشرية", projects: "المشاريع",
};

function DefinitionsPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "كل مؤشر في الوحدة 12 محسوب من البيانات الفعلية داخل قاعدة البيانات، بتوقيت الرياض، دون أي أرقام ثابتة أو بيانات تجريبية.",
          "Every KPI in Module 12 is computed from live database records in Riyadh time, with no hardcoded or demo figures.",
        )}
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("المؤشر", "KPI")}</TableHead>
              <TableHead>{t("النطاق", "Scope")}</TableHead>
              <TableHead>{t("الصيغة", "Formula")}</TableHead>
              <TableHead>{t("المصدر", "Source")}</TableHead>
              <TableHead>{t("التحديث", "Refresh")}</TableHead>
              <TableHead>{t("الصلاحية", "Permission")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {KPI_CATALOG.map((k) => (
              <TableRow key={k.key}>
                <TableCell className="font-medium">{t(k.nameAr, k.nameEn)}</TableCell>
                <TableCell className="text-sm">{t(SCOPE_AR[k.scope] ?? k.scope, k.scope)}</TableCell>
                <TableCell className="max-w-sm text-sm text-muted-foreground">{k.formulaAr}</TableCell>
                <TableCell className="font-mono text-xs">{k.sourceAr}</TableCell>
                <TableCell className="text-sm">{k.refreshAr}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {k.roles ? k.roles.join(", ") : t("جميع مستخدمي المنشأة", "All company users")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

