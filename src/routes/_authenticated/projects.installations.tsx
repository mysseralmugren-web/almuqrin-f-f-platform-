import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Printer, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT, useTheme } from "@/lib/theme";
import { INSTALL_STATUS, PROJECT_STATUS } from "@/lib/projects-constants";
import { Loading, StatusChip, UploadButton, useProjectFail } from "@/components/app/projects-ui";
import {
  listProjects, listInstallationOrders, createInstallationOrder, setInstallationStatus, recordInstallationVisit,
  listInstallationTeams, createInstallationTeam, listProjectDeliveryNotes, createProjectDeliveryNote, setDeliveryNoteStatus,
} from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/projects/installations")({
  head: () => ({
    meta: [
      { title: "أوامر التركيب والتسليم · AlMugren AI Factory OS" },
      { name: "description", content: "Installation orders, site visits, teams and delivery notes." },
    ],
  }),
  component: InstallationsPage,
});

const DELIVERY_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  acknowledged: { ar: "مستلم من العميل", en: "Acknowledged" },
} as const;

function InstallationsPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const fetchProjects = useServerFn(listProjects);
  const fetchOrders = useServerFn(listInstallationOrders);
  const fetchTeams = useServerFn(listInstallationTeams);
  const fetchNotes = useServerFn(listProjectDeliveryNotes);
  const addOrder = useServerFn(createInstallationOrder);
  const setStatus = useServerFn(setInstallationStatus);
  const addVisit = useServerFn(recordInstallationVisit);
  const addTeam = useServerFn(createInstallationTeam);
  const addNote = useServerFn(createProjectDeliveryNote);
  const setNoteStatus = useServerFn(setDeliveryNoteStatus);

  const [io, setIo] = useState({ project_id: "", team_id: "", scheduled_date: "", scheduled_time: "", contact_name: "", contact_phone: "", site_address: "", notes: "" });
  const [team, setTeam] = useState({ name_ar: "", vehicle_plate: "", tools_note: "" });
  const [dn, setDn] = useState({ project_id: "", delivery_date: today, received_by: "", received_id_number: "", notes: "" });
  const [dnItems, setDnItems] = useState([{ description: "", unit: "قطعة", quantity: "1" }]);

  const projectsQ = useQuery({ queryKey: ["projects", "", "all"], queryFn: () => fetchProjects({ data: {} }) });
  const ordersQ = useQuery({ queryKey: ["installation-orders"], queryFn: () => fetchOrders({ data: {} }) });
  const teamsQ = useQuery({ queryKey: ["installation-teams"], queryFn: () => fetchTeams() });
  const notesQ = useQuery({ queryKey: ["project-delivery-notes"], queryFn: () => fetchNotes({ data: {} }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["installation-orders"] });
    qc.invalidateQueries({ queryKey: ["installation-teams"] });
    qc.invalidateQueries({ queryKey: ["project-delivery-notes"] });
  };

  const mOrder = useMutation({
    mutationFn: () => addOrder({ data: { project_id: io.project_id, team_id: io.team_id || null, scheduled_date: io.scheduled_date || null, scheduled_time: io.scheduled_time || null, contact_name: io.contact_name || null, contact_phone: io.contact_phone || null, site_address: io.site_address || null, notes: io.notes || null } }),
    onSuccess: () => { toast.success(t("تم إنشاء أمر التركيب", "Installation order created")); setIo({ project_id: "", team_id: "", scheduled_date: "", scheduled_time: "", contact_name: "", contact_phone: "", site_address: "", notes: "" }); refresh(); },
    onError: fail,
  });
  const mStatus = useMutation({ mutationFn: (v: { id: string; status: string }) => setStatus({ data: { id: v.id, status: v.status as any } }), onSuccess: refresh, onError: fail });
  const mVisit = useMutation({ mutationFn: (v: any) => addVisit({ data: v }), onSuccess: () => { toast.success(t("تم تسجيل الحدث", "Visit event recorded")); refresh(); }, onError: fail });
  const mTeam = useMutation({ mutationFn: () => addTeam({ data: { name_ar: team.name_ar, vehicle_plate: team.vehicle_plate || null, tools_note: team.tools_note || null } }), onSuccess: () => { setTeam({ name_ar: "", vehicle_plate: "", tools_note: "" }); refresh(); }, onError: fail });
  const mNote = useMutation({
    mutationFn: () =>
      addNote({
        data: {
          project_id: dn.project_id,
          delivery_date: dn.delivery_date,
          received_by: dn.received_by || null,
          received_id_number: dn.received_id_number || null,
          notes: dn.notes || null,
          items: dnItems.filter((i) => i.description.trim()).map((i) => ({ description: i.description, unit: i.unit, quantity: Number(i.quantity) || 1 })),
        },
      }),
    onSuccess: () => { toast.success(t("تم إنشاء إذن التسليم", "Delivery note created")); setDnItems([{ description: "", unit: "قطعة", quantity: "1" }]); refresh(); },
    onError: fail,
  });
  const mNoteStatus = useMutation({ mutationFn: (v: { id: string; status: string }) => setNoteStatus({ data: { id: v.id, status: v.status as any } }), onSuccess: refresh, onError: fail });

  if (ordersQ.isLoading) return <Loading />;
  const projects: any[] = projectsQ.data ?? [];
  const teams: any[] = teamsQ.data ?? [];

  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">{t("أوامر التركيب", "Installation orders")}</TabsTrigger>
        <TabsTrigger value="teams">{t("فرق التركيب", "Teams")}</TabsTrigger>
        <TabsTrigger value="delivery">{t("أذون التسليم", "Delivery notes")}</TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="mt-4 space-y-5">
        <Card className="shadow-card">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>{t("المشروع", "Project")}</Label>
              <Select value={io.project_id} onValueChange={(v) => setIo({ ...io, project_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر المشروع", "Select project")} /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("الفريق", "Team")}</Label>
              <Select value={io.team_id} onValueChange={(v) => setIo({ ...io, team_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر الفريق", "Select team")} /></SelectTrigger>
                <SelectContent>{teams.map((x) => <SelectItem key={x.id} value={x.id}>{x.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("التاريخ", "Date")}</Label><Input type="date" dir="ltr" value={io.scheduled_date} onChange={(e) => setIo({ ...io, scheduled_date: e.target.value })} /></div>
            <div><Label>{t("الوقت", "Time")}</Label><Input type="time" dir="ltr" value={io.scheduled_time} onChange={(e) => setIo({ ...io, scheduled_time: e.target.value })} /></div>
            <div><Label>{t("جهة الاتصال", "Contact")}</Label><Input value={io.contact_name} onChange={(e) => setIo({ ...io, contact_name: e.target.value })} /></div>
            <div><Label>{t("الجوال", "Phone")}</Label><Input dir="ltr" value={io.contact_phone} onChange={(e) => setIo({ ...io, contact_phone: e.target.value })} /></div>
            <div><Label>{t("عنوان الموقع", "Site address")}</Label><Input value={io.site_address} onChange={(e) => setIo({ ...io, site_address: e.target.value })} /></div>
            <Textarea className="sm:col-span-3" rows={2} placeholder={t("تعليمات الفريق والأدوات المطلوبة", "Team instructions and tools")} value={io.notes} onChange={(e) => setIo({ ...io, notes: e.target.value })} />
            <div className="flex items-end">
              <Button className="w-full gap-2 gradient-primary" disabled={!io.project_id} onClick={() => mOrder.mutate()}><Plus className="h-4 w-4" />{t("أمر تركيب", "Create order")}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(ordersQ.data ?? []).map((o: any) => (
            <Card key={o.id} className="shadow-card">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" dir="ltr">{o.io_number}</span>
                      <StatusChip value={o.status} map={INSTALL_STATUS} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {o.projects?.project_number} · {o.projects?.name_ar} · {o.installation_teams?.name_ar ?? t("بدون فريق", "No team")} · <span dir="ltr">{o.scheduled_date ?? "—"} {o.scheduled_time ?? ""}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={o.status} onValueChange={(v) => mStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(INSTALL_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to="/print/project/$kind/$id" params={{ kind: "installation", id: o.id }}><Printer className="h-4 w-4" />{t("أمر التركيب", "Work order")}</Link>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["arrived", "started", "paused", "completed"] as const).map((ev) => (
                    <Button key={ev} size="sm" variant="outline" onClick={() => mVisit.mutate({ installation_order_id: o.id, visit_date: today, event: ev, photo_paths: [] })}>
                      {t({ arrived: "وصول الفريق", started: "بدء العمل", paused: "توقف", completed: "إنهاء" }[ev], { arrived: "Arrived", started: "Started", paused: "Paused", completed: "Completed" }[ev])}
                    </Button>
                  ))}
                  <UploadButton projectId={o.project_id} kind="installation" label={t("صورة موقع", "Site photo")} onUploaded={(p) => mVisit.mutate({ installation_order_id: o.id, visit_date: today, event: "started", photo_paths: [p] })} />
                </div>

                {(o.installation_visits ?? []).length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("التاريخ", "Date")}</TableHead>
                        <TableHead>{t("وصول", "Arrived")}</TableHead>
                        <TableHead>{t("بدء", "Started")}</TableHead>
                        <TableHead>{t("توقف", "Paused")}</TableHead>
                        <TableHead>{t("إنهاء", "Completed")}</TableHead>
                        <TableHead>{t("صور", "Photos")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(o.installation_visits ?? []).map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell dir="ltr">{v.visit_date}</TableCell>
                          <TableCell dir="ltr">{v.arrived_at?.slice(11, 16) ?? "—"}</TableCell>
                          <TableCell dir="ltr">{v.started_at?.slice(11, 16) ?? "—"}</TableCell>
                          <TableCell dir="ltr">{v.paused_at?.slice(11, 16) ?? "—"}</TableCell>
                          <TableCell dir="ltr">{v.completed_at?.slice(11, 16) ?? "—"}</TableCell>
                          <TableCell dir="ltr">{(v.photo_paths ?? []).length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="teams" className="mt-4 space-y-5">
        <Card className="shadow-card">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
            <Input placeholder={t("اسم الفريق", "Team name")} value={team.name_ar} onChange={(e) => setTeam({ ...team, name_ar: e.target.value })} />
            <Input placeholder={t("لوحة المركبة", "Vehicle plate")} dir="ltr" value={team.vehicle_plate} onChange={(e) => setTeam({ ...team, vehicle_plate: e.target.value })} />
            <Input placeholder={t("الأدوات", "Tools")} value={team.tools_note} onChange={(e) => setTeam({ ...team, tools_note: e.target.value })} />
            <Button className="gap-2 gradient-primary" disabled={!team.name_ar.trim()} onClick={() => mTeam.mutate()}><Users className="h-4 w-4" />{t("إضافة فريق", "Add team")}</Button>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الفريق", "Team")}</TableHead>
                  <TableHead>{t("المركبة", "Vehicle")}</TableHead>
                  <TableHead>{t("الأعضاء", "Members")}</TableHead>
                  <TableHead>{t("الأدوات", "Tools")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{t("لا توجد فرق", "No teams")}</TableCell></TableRow>}
                {teams.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-medium">{x.name_ar}</TableCell>
                    <TableCell dir="ltr">{x.vehicle_plate ?? "—"}</TableCell>
                    <TableCell>{(x.installation_team_members ?? []).map((m: any) => m.employees?.full_name_ar).filter(Boolean).join("، ") || "—"}</TableCell>
                    <TableCell>{x.tools_note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="delivery" className="mt-4 space-y-5">
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label>{t("المشروع", "Project")}</Label>
                <Select value={dn.project_id} onValueChange={(v) => setDn({ ...dn, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("اختر المشروع", "Select project")} /></SelectTrigger>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("تاريخ التسليم", "Delivery date")}</Label><Input type="date" dir="ltr" value={dn.delivery_date} onChange={(e) => setDn({ ...dn, delivery_date: e.target.value })} /></div>
              <div><Label>{t("المستلم", "Received by")}</Label><Input value={dn.received_by} onChange={(e) => setDn({ ...dn, received_by: e.target.value })} /></div>
              <div><Label>{t("رقم هوية المستلم", "Receiver ID")}</Label><Input dir="ltr" value={dn.received_id_number} onChange={(e) => setDn({ ...dn, received_id_number: e.target.value })} /></div>
            </div>

            {dnItems.map((it, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-6">
                <Input className="sm:col-span-3" placeholder={t("وصف البند", "Item description")} value={it.description} onChange={(e) => setDnItems(dnItems.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))} />
                <Input placeholder={t("الوحدة", "Unit")} value={it.unit} onChange={(e) => setDnItems(dnItems.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)))} />
                <Input type="number" dir="ltr" value={it.quantity} onChange={(e) => setDnItems(dnItems.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))} />
                <Button variant="ghost" onClick={() => setDnItems(dnItems.filter((_, i) => i !== idx))}>{t("حذف", "Remove")}</Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDnItems([...dnItems, { description: "", unit: "قطعة", quantity: "1" }])}>{t("إضافة بند", "Add line")}</Button>
              <Button size="sm" className="gap-1 gradient-primary" disabled={!dn.project_id || !dnItems.some((i) => i.description.trim())} onClick={() => mNote.mutate()}>
                <Truck className="h-4 w-4" />{t("إنشاء إذن تسليم", "Create delivery note")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("لا يمكن التسليم قبل اكتمال التصنيع واعتماد الجودة، ولا يمكن تجاوز الكميات المطلوبة في أمر البيع.", "Delivery is blocked before production completion and quality approval, and cannot exceed the ordered quantities.")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم الإذن", "Note #")}</TableHead>
                  <TableHead>{t("المشروع", "Project")}</TableHead>
                  <TableHead>{t("العميل", "Customer")}</TableHead>
                  <TableHead>{t("التاريخ", "Date")}</TableHead>
                  <TableHead>{t("البنود", "Lines")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(notesQ.data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("لا توجد أذون تسليم", "No delivery notes")}</TableCell></TableRow>}
                {(notesQ.data ?? []).map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium" dir="ltr">{n.dn_number}</TableCell>
                    <TableCell>{n.projects?.project_number ?? "—"}</TableCell>
                    <TableCell>{n.customers?.name_ar ?? "—"}</TableCell>
                    <TableCell dir="ltr">{n.delivery_date}</TableCell>
                    <TableCell dir="ltr">{(n.delivery_note_items ?? []).length}</TableCell>
                    <TableCell><StatusChip value={n.status} map={DELIVERY_STATUS} /></TableCell>
                    <TableCell className="flex justify-end gap-1">
                      {n.status === "draft" && <Button size="sm" variant="outline" onClick={() => mNoteStatus.mutate({ id: n.id, status: "delivered" })}>{t("تأكيد التسليم", "Mark delivered")}</Button>}
                      {n.status === "delivered" && <Button size="sm" variant="outline" onClick={() => mNoteStatus.mutate({ id: n.id, status: "acknowledged" })}>{t("إقرار العميل", "Acknowledge")}</Button>}
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/print/project/$kind/$id" params={{ kind: "delivery", id: n.id }}><Printer className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

