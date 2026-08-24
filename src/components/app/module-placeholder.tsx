import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ArrowUpRight } from "lucide-react";

interface Props {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: LucideIcon;
}

export function ModulePlaceholder({ titleAr, titleEn, descAr, descEn, icon: Icon }: Props) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <Icon className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">
                {t(titleAr, titleEn)}
              </h1>
              <Badge variant="outline" className="border-accent/40 text-accent-foreground">
                {t("قريباً", "Coming soon")}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {t(descAr, descEn)}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-dashed shadow-card">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft">
            <Sparkles className="h-7 w-7 text-accent-foreground" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-semibold">
              {t("هذه الوحدة قيد التطوير", "This module is in development")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "تم إعداد الهيكل الأساسي والواجهة. سيتم إضافة منطق العمل والبيانات في الخطوة التالية.",
                "The foundation and interface are ready. Business logic and data will be added in the next phase.",
              )}
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            {t("طلب الوصول المبكر", "Request early access")}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
