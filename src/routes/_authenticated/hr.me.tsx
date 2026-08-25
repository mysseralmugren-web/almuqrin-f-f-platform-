import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { UserCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/app/purchasing-ui";
import { Loading, ErrorState, riyal } from "@/components/app/hr-ui";
import { getMySelfService } from "@/lib/hr.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/me")({
  head: () => ({
    meta: [
      { title: "خدمة الموظف الذاتية · AlMugren AI Factory OS" },
      { name: "description", content: "Personal profile, contracts, leave requests, custodies and payslips." },
      { property: "og:title", content: "خدمة الموظف الذاتية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Your profile, leave, custody and payslips." },
    ],
  }),
  component: SelfServicePage,
});

function SelfServicePage() {
  const t = useT();
  const fetchMe = useServerFn(getMySelfService);
  const q = useQuery({ queryKey: ["hr-me"], queryFn: () => fetchMe({}) });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={t("تعذر تحميل بياناتك", "Could not load your data")} />;
  if (!q.data?.employee)
    return (
      <EmptyState
        icon={<UserCircle2 className="h-6 w-6" />}
        title={t("لا يوجد ملف موظف مرتبط بحسابك", "No employee profile linked to your account")}
        hint={t("تواصل مع الموارد البشرية لربط حسابك بملف الموظف.", "Contact HR to link your account to an employee record.")}
      />
    );

  const e: any = q.data.employee;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ملفي", "My profile")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div><div className="text-xs text-muted-foreground">{t("رقم الموظف", "Employee no.")}</div><div className="font-mono">{e.employee_number}</div></div>
          <div><div className="text-xs text-muted-foreground">{t("الاسم", "Name")}</div><div>{e.full_name_ar}</div></div>
          <div><div className="text-xs text-muted-foreground">{t("تاريخ الانضمام", "Join date")}</div><div className="font-mono">{e.join_date}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("قسائم الراتب", "Payslips")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {q.data.payslips.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("لا توجد قسائم معتمدة بعد", "No approved payslips yet")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الفترة", "Period")}</TableHead>
                  <TableHead>{t("الصافي", "Net")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.payslips.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.payroll_runs.payroll_periods.year}-{String(p.payroll_runs.payroll_periods.month).padStart(2, "0")}</TableCell>
                    <TableCell className="font-mono font-semibold">{riyal(p.net_pay)}</TableCell>
                    <TableCell className="text-end">
                      <Button asChild size="sm" variant="ghost"><Link to="/print/payslip/$id" params={{ id: p.id }}><Printer className="h-4 w-4" /></Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("إجازاتي", "My leave")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {q.data.leaves.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("لا توجد طلبات", "No requests")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("النوع", "Type")}</TableHead>
                  <TableHead>{t("من", "From")}</TableHead>
                  <TableHead>{t("إلى", "To")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.leaves.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.leave_types.name_ar}</TableCell>
                    <TableCell className="font-mono text-xs">{l.start_date}</TableCell>
                    <TableCell className="font-mono text-xs">{l.end_date}</TableCell>
                    <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("العهد", "Custodies")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {q.data.custodies.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("لا توجد عهد", "No custodies")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الصنف", "Item")}</TableHead>
                  <TableHead>{t("تاريخ التسليم", "Issued")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.custodies.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.item_name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.issued_date}</TableCell>
                    <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

