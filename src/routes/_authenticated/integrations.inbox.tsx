import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Globe, MessageCircle, BellRing, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";
import { getUnifiedInbox } from "@/lib/integrations.functions";
import { INBOX_SOURCE_LABEL, PRIORITY_LABEL, type Priority } from "@/lib/integrations-constants";

export const Route = createFileRoute("/_authenticated/integrations/inbox")({
  component: UnifiedInbox,
});

const ICONS = { website: Globe, whatsapp: MessageCircle, notification: BellRing } as const;

function UnifiedInbox() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const fetchInbox = useServerFn(getUnifiedInbox);
  const { data } = useQuery({
    queryKey: ["inbox", search, onlyUnread],
    queryFn: () => fetchInbox({ data: { search: search || undefined, only_unread: onlyUnread } }),
  });

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{t("الصندوق الموحّد", "Unified inbox")}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("بحث آمن...", "Safe search...")}
              className="h-9 w-56 ltr:pl-9 rtl:pr-9"
            />
          </div>
          <Button size="sm" variant={onlyUnread ? "default" : "outline"} onClick={() => setOnlyUnread((v) => !v)}>
            {t("غير المقروء", "Unread")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(data ?? []).length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">{t("لا توجد عناصر", "No items")}</div>
        )}
        {(data ?? []).map((item) => {
          const Icon = ICONS[item.source];
          const overdue = item.sla_due_at ? new Date(item.sla_due_at) < new Date() : false;
          return (
            <div
              key={`${item.source}-${item.id}`}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.title}</div>
                <div className="truncate text-xs text-muted-foreground">{item.preview}</div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {t(INBOX_SOURCE_LABEL[item.source].ar, INBOX_SOURCE_LABEL[item.source].en)}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {t(PRIORITY_LABEL[item.priority as Priority].ar, PRIORITY_LABEL[item.priority as Priority].en)}
              </Badge>
              {item.unread && <Badge className="text-[10px]">{t("جديد", "New")}</Badge>}
              {overdue && <Badge variant="destructive" className="text-[10px]">{t("تجاوز SLA", "SLA breached")}</Badge>}
              <span className="text-[11px] text-muted-foreground">{new Date(item.at).toLocaleString()}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
