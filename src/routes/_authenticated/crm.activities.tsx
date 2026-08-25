import { createFileRoute } from "@tanstack/react-router";
import { Phone, Users2, Mail, MapPin, CheckSquare, Plus, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/theme";
import { ACTIVITIES } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/crm/activities")({
  head: () => ({
    meta: [
      { title: "Activities · CRM · AlMugren AI Factory OS" },
      { name: "description", content: "Calls, meetings, visits and follow-up tasks for the sales team." },
    ],
  }),
  component: ActivitiesPage,
});

const ICONS = { call: Phone, meeting: Users2, email: Mail, visit: MapPin, task: CheckSquare } as const;
const TYPE_LABEL = {
  call: { ar: "مكالمة", en: "Call" },
  meeting: { ar: "اجتماع", en: "Meeting" },
  email: { ar: "بريد", en: "Email" },
  visit: { ar: "زيارة", en: "Visit" },
  task: { ar: "مهمة", en: "Task" },
} as const;

function ActivitiesPage() {
  const t = useT();
  const open = ACTIVITIES.filter((a) => !a.done);
  const done = ACTIVITIES.filter((a) => a.done);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-card lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4 text-primary" />
              {t("المتابعات المفتوحة", "Open follow-ups")}
            </CardTitle>
            <CardDescription>{t("مهام فريق المبيعات المجدولة.", "Scheduled sales-team tasks.")}</CardDescription>
          </div>
          <Button className="h-9 gap-2 gradient-primary"><Plus className="h-4 w-4" />{t("نشاط", "Activity")}</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {open.map((a) => {
            const Icon = ICONS[a.type];
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox className="mt-1" />
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(a.ar, a.en)}</div>
                  <div className="text-xs text-muted-foreground">
                    <span dir="ltr">{a.related}</span> · {a.owner}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{a.due}</div>
              </div>
            );
          })}
          <Separator className="my-3" />
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("مكتملة", "Completed")}</div>
          {done.map((a) => {
            const Icon = ICONS[a.type];
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-dashed p-3 opacity-70">
                <Checkbox className="mt-1" defaultChecked />
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-through">{t(a.ar, a.en)}</div>
                  <div className="text-xs text-muted-foreground"><span dir="ltr">{a.related}</span> · {a.owner}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("حسب النوع", "By type")}</CardTitle>
          <CardDescription>{t("توزيع أنشطة الفريق.", "Team activity distribution.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.keys(TYPE_LABEL) as Array<keyof typeof TYPE_LABEL>).map((k) => {
            const Icon = ICONS[k];
            const count = ACTIVITIES.filter((a) => a.type === k).length;
            return (
              <div key={k} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t(TYPE_LABEL[k].ar, TYPE_LABEL[k].en)}</span>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

