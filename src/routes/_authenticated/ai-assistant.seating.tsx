import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Armchair, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/theme";
import { SEAT_PITCHES, type SeatPitch } from "@/lib/ai-constants";
import { useAiFail } from "@/components/app/ai-ui";
import { computeSeatingCapacity } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/seating")({
  head: () => ({
    meta: [
      { title: "حاسبة سعة الجلسات · AlMugren AI Factory OS" },
      { name: "description", content: "Seating capacity calculator with 55/60/65 cm pitch, showing the formula and assumptions." },
    ],
  }),
  component: SeatingPage,
});

type Seg = { label: string; length_cm: string };

function SeatingPage() {
  const t = useT();
  const fail = useAiFail();
  const compute = useServerFn(computeSeatingCapacity);

  const [pitch, setPitch] = useState<SeatPitch>(60);
  const [corner, setCorner] = useState("0");
  const [armrest, setArmrest] = useState("0");
  const [segs, setSegs] = useState<Seg[]>([{ label: "", length_cm: "300" }]);
  const [result, setResult] = useState<any>(null);

  const run = useMutation({
    mutationFn: () =>
      compute({
        data: {
          pitch_cm: pitch,
          corner_loss_cm: Number(corner) || 0,
          armrest_loss_cm: Number(armrest) || 0,
          segments: segs.map((s) => ({ label: s.label || undefined, length_cm: Number(s.length_cm) || 0 })),
        },
      }),
    onSuccess: setResult,
    onError: fail,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Armchair className="h-4 w-4" />{t("المدخلات", "Inputs")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("العرض للشخص (سم)", "Pitch per person (cm)")}</Label>
              <Select value={String(pitch)} onValueChange={(v) => setPitch(Number(v) as SeatPitch)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEAT_PITCHES.map((p) => (<SelectItem key={p} value={String(p)}>{p} {t("سم", "cm")}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("فاقد الزوايا (سم)", "Corner loss (cm)")}</Label>
              <Input value={corner} onChange={(e) => setCorner(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("فاقد المساند (سم)", "Armrest loss (cm)")}</Label>
              <Input value={armrest} onChange={(e) => setArmrest(e.target.value)} dir="ltr" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("القطع", "Segments")}</Label>
            {segs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={t("الوصف", "Label")} value={s.label} onChange={(e) => setSegs((x) => x.map((v, idx) => (idx === i ? { ...v, label: e.target.value } : v)))} />
                <Input placeholder={t("الطول سم", "Length cm")} value={s.length_cm} dir="ltr" onChange={(e) => setSegs((x) => x.map((v, idx) => (idx === i ? { ...v, length_cm: e.target.value } : v)))} />
                <Button variant="ghost" size="icon" onClick={() => setSegs((x) => (x.length > 1 ? x.filter((_, idx) => idx !== i) : x))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setSegs((x) => [...x, { label: "", length_cm: "" }])} disabled={segs.length >= 20}>
              <Plus className="h-4 w-4" />{t("إضافة قطعة", "Add segment")}
            </Button>
          </div>

          <Button onClick={() => run.mutate()} disabled={run.isPending}>{t("احسب", "Calculate")}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("النتيجة والمعادلة", "Result & formula")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!result && <p className="text-sm text-muted-foreground">{t("أدخل المقاسات ثم اضغط احسب", "Enter measurements then calculate")}</p>}
          {result && (
            <>
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground">{t("إجمالي عدد الأشخاص", "Total seats")}</div>
                <div className="text-4xl font-bold" dir="ltr">{result.total_seats}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs" dir="auto">{result.formula}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("القطعة", "Segment")}</TableHead>
                    <TableHead>{t("الطول", "Length")}</TableHead>
                    <TableHead>{t("الصالح", "Usable")}</TableHead>
                    <TableHead>{t("عدد الأشخاص", "Seats")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{r.label || `#${i + 1}`}</TableCell>
                      <TableCell dir="ltr">{r.length_cm}</TableCell>
                      <TableCell dir="ltr">{r.usable_cm}</TableCell>
                      <TableCell dir="ltr">{r.seats}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {Array.isArray(result.assumptions) && result.assumptions.length > 0 && (
                <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                  {result.assumptions.map((a: string, i: number) => (<li key={i}>{a}</li>))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

