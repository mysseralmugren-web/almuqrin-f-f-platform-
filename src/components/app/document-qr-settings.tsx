import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getDocumentQrSettings, saveDocumentQrSettings } from "@/lib/document-qr.functions";
import { useT } from "@/lib/theme";

export function DocumentQrSettings() {
  const t = useT();
  const getSettings = useServerFn(getDocumentQrSettings);
  const saveSettings = useServerFn(saveDocumentQrSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["document-qr-settings"], queryFn: () => getSettings({}) });
  const [enabled, setEnabled] = useState(true);
  const [position, setPosition] = useState<"footer" | "header">("footer");
  const [size, setSize] = useState(96);
  const [labelAr, setLabelAr] = useState("امسح للتحقق من صحة المستند");
  const [labelEn, setLabelEn] = useState("Scan to verify this document");
  const [showTax, setShowTax] = useState(true);

  useEffect(() => {
    if (!data) return;
    setEnabled(Boolean(data.enabled));
    setPosition(data.position === "header" ? "header" : "footer");
    setSize(Number(data.size_px ?? 96));
    setLabelAr(String(data.label_ar ?? "امسح للتحقق من صحة المستند"));
    setLabelEn(String(data.label_en ?? "Scan to verify this document"));
    setShowTax(Boolean(data.show_internal_on_tax_invoice));
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveSettings({ data: { enabled, position, size_px: size, label_ar: labelAr, label_en: labelEn, show_internal_on_tax_invoice: showTax } }),
    onSuccess: async () => { toast.success(t("تم حفظ إعدادات QR", "QR settings saved")); await qc.invalidateQueries({ queryKey: ["document-qr-settings"] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("تعذر الحفظ", "Save failed")),
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" />{t("QR المستندات", "Document QR")}</CardTitle>
        <CardDescription>{t("رمز تحقق لكل مستند صادر، مع إبقاء QR زاتكا للفواتير الضريبية مستقلاً.", "Verification QR for every issued document, while keeping ZATCA invoice QR separate.")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Toggle label={t("تفعيل QR", "Enable QR")} value={enabled} setValue={setEnabled} />
        <Toggle label={t("إظهار QR التحقق مع الفاتورة الضريبية", "Show verification QR on tax invoices")} value={showTax} setValue={setShowTax} />
        <div className="space-y-2"><Label>{t("الموضع", "Position")}</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={position} onChange={(e) => setPosition(e.target.value === "header" ? "header" : "footer")}><option value="footer">{t("أسفل المستند", "Footer")}</option><option value="header">{t("أعلى المستند", "Header")}</option></select></div>
        <div className="space-y-2"><Label>{t("الحجم", "Size")}</Label><Input type="number" min={64} max={180} value={size} onChange={(e) => setSize(Math.min(180, Math.max(64, Number(e.target.value) || 96)))} /></div>
        <div className="space-y-2"><Label>{t("النص العربي", "Arabic label")}</Label><Input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} /></div>
        <div className="space-y-2"><Label>{t("النص الإنجليزي", "English label")}</Label><Input dir="ltr" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} /></div>
        <div className="md:col-span-2 flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" />{t("حفظ إعدادات QR", "Save QR settings")}</Button></div>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-lg border p-4"><Label>{label}</Label><Switch checked={value} onCheckedChange={setValue} /></div>;
}
