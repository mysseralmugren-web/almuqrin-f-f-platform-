import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/theme";
import { APPROVAL_STATUS } from "@/lib/projects-constants";
import { Loading, StatusChip, UploadButton, ViewFileButton, useProjectFail } from "@/components/app/projects-ui";
import {
  listDrawings, createDrawing, addDrawingRevision, decideDrawingRevision,
  listApprovals, createMaterialApproval, createColorApproval, decideApproval,
} from "@/lib/projects.functions";

function DecideDialog({ onDecide, disabled }: { onDecide: (v: { status: "approved" | "rejected"; by: string; comment: string; reason: string }) => void; disabled?: boolean }) {
  const t = useT();
  const [by, setBy] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>{t("قرار العميل", "Customer decision")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("تسجيل قرار العميل", "Record customer decision")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("اسم ممثل العميل", "Customer representative")}</Label><Input value={by} onChange={(e) => setBy(e.target.value)} /></div>
          <div><Label>{t("ملاحظات العميل", "Customer comment")}</Label><Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <div><Label>{t("سبب الرفض (عند الرفض)", "Rejection reason (if rejected)")}</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" className="gap-1" disabled={!by.trim() || !reason.trim()} onClick={() => onDecide({ status: "rejected", by, comment, reason })}>
            <XCircle className="h-4 w-4" />{t("رفض", "Reject")}
          </Button>
          <Button className="gap-1 gradient-primary" disabled={!by.trim()} onClick={() => onDecide({ status: "approved", by, comment, reason: "" })}>
            <CheckCircle2 className="h-4 w-4" />{t("اعتماد", "Approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApprovalsTab({ projectId }: { projectId: string }) {
  const t = useT();
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchDrawings = useServerFn(listDrawings);
  const fetchApprovals = useServerFn(listApprovals);
  const newDrawing = useServerFn(createDrawing);
  const newRevision = useServerFn(addDrawingRevision);
  const decideRev = useServerFn(decideDrawingRevision);
  const newMaterial = useServerFn(createMaterialApproval);
  const newColor = useServerFn(createColorApproval);
  const decideAppr = useServerFn(decideApproval);

  const [dTitle, setDTitle] = useState("");
  const [mat, setMat] = useState({ material_name: "", specification: "", supplier_name: "", object_path: "" });
  const [col, setCol] = useState({ color_name: "", color_code: "", finish_type: "", object_path: "" });

  const drawings = useQuery({ queryKey: ["drawings", projectId], queryFn: () => fetchDrawings({ data: { project_id: projectId } }) });
  const materials = useQuery({ queryKey: ["appr", "material", projectId], queryFn: () => fetchApprovals({ data: { project_id: projectId, kind: "material" } }) });
  const colors = useQuery({ queryKey: ["appr", "color", projectId], queryFn: () => fetchApprovals({ data: { project_id: projectId, kind: "color" } }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["drawings", projectId] });
    qc.invalidateQueries({ queryKey: ["appr"] });
  };

  const mDrawing = useMutation({ mutationFn: () => newDrawing({ data: { project_id: projectId, title_ar: dTitle, discipline: null } }), onSuccess: () => { setDTitle(""); refresh(); }, onError: fail });
  const mRevision = useMutation({ mutationFn: (v: { id: string; path: string | null }) => newRevision({ data: { project_drawing_id: v.id, object_path: v.path, change_note: null } }), onSuccess: () => { toast.success(t("تم رفع إصدار جديد", "New revision added")); refresh(); }, onError: fail });
  const mDecideRev = useMutation({ mutationFn: (v: any) => decideRev({ data: v }), onSuccess: () => { toast.success(t("تم تسجيل القرار", "Decision recorded")); refresh(); }, onError: fail });
  const mMat = useMutation({ mutationFn: () => newMaterial({ data: { project_id: projectId, ...mat, specification: mat.specification || null, supplier_name: mat.supplier_name || null, object_path: mat.object_path || null } }), onSuccess: () => { setMat({ material_name: "", specification: "", supplier_name: "", object_path: "" }); refresh(); }, onError: fail });
  const mCol = useMutation({ mutationFn: () => newColor({ data: { project_id: projectId, ...col, color_code: col.color_code || null, finish_type: col.finish_type || null, object_path: col.object_path || null } }), onSuccess: () => { setCol({ color_name: "", color_code: "", finish_type: "", object_path: "" }); refresh(); }, onError: fail });
  const mDecideAppr = useMutation({ mutationFn: (v: any) => decideAppr({ data: v }), onSuccess: () => { toast.success(t("تم تسجيل القرار", "Decision recorded")); refresh(); }, onError: fail });

  if (drawings.isLoading || materials.isLoading || colors.isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Label>{t("عنوان الرسم الهندسي", "Drawing title")}</Label>
              <Input value={dTitle} onChange={(e) => setDTitle(e.target.value)} />
            </div>
            <Button className="gap-2 gradient-primary" disabled={!dTitle.trim()} onClick={() => mDrawing.mutate()}>
              <Plus className="h-4 w-4" />{t("إضافة رسم", "Add drawing")}
            </Button>
          </div>

          {(drawings.data ?? []).map((d: any) => (
            <div key={d.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{d.title_ar}</span>
                  <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{d.drawing_number}</span>
                </div>
                <UploadButton projectId={projectId} kind="drawings" label={t("إصدار جديد", "New revision")} onUploaded={(path) => mRevision.mutate({ id: d.id, path })} />
              </div>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الإصدار", "Rev")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("قرار العميل", "Decided by")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d.drawing_revisions ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">{t("لا توجد إصدارات", "No revisions")}</TableCell></TableRow>
                  )}
                  {(d.drawing_revisions ?? []).sort((a: any, b: any) => b.revision - a.revision).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr">R{r.revision}</TableCell>
                      <TableCell><StatusChip value={r.status} map={APPROVAL_STATUS} /></TableCell>
                      <TableCell className="text-xs">{r.decided_by ?? "—"}{r.rejection_reason ? ` · ${r.rejection_reason}` : ""}</TableCell>
                      <TableCell className="flex justify-end gap-1">
                        <ViewFileButton path={r.object_path} label={t("عرض", "View")} />
                        {r.status === "submitted" && (
                          <DecideDialog onDecide={(v) => mDecideRev.mutate({ id: r.id, status: v.status, decided_by: v.by, customer_comment: v.comment || null, rejection_reason: v.reason || null })} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="font-semibold">{t("اعتماد الخامات", "Material approvals")}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder={t("اسم الخامة", "Material")} value={mat.material_name} onChange={(e) => setMat({ ...mat, material_name: e.target.value })} />
              <Input placeholder={t("المورد", "Supplier")} value={mat.supplier_name} onChange={(e) => setMat({ ...mat, supplier_name: e.target.value })} />
              <Textarea rows={2} className="sm:col-span-2" placeholder={t("المواصفات", "Specification")} value={mat.specification} onChange={(e) => setMat({ ...mat, specification: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UploadButton projectId={projectId} kind="materials" label={mat.object_path ? t("تم إرفاق ملف", "File attached") : t("إرفاق عينة", "Attach sample")} onUploaded={(p) => setMat({ ...mat, object_path: p })} />
              <Button size="sm" className="gap-1 gradient-primary" disabled={!mat.material_name.trim()} onClick={() => mMat.mutate()}><Plus className="h-4 w-4" />{t("إرسال للاعتماد", "Submit")}</Button>
            </div>
            <Table>
              <TableBody>
                {(materials.data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.material_name}</div>
                      <div className="text-xs text-muted-foreground">{r.supplier_name ?? "—"}{r.rejection_reason ? ` · ${r.rejection_reason}` : ""}</div>
                    </TableCell>
                    <TableCell><StatusChip value={r.status} map={APPROVAL_STATUS} /></TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <ViewFileButton path={r.object_path} label={t("عرض", "View")} />
                      {(r.status === "draft" || r.status === "submitted") && (
                        <DecideDialog onDecide={(v) => mDecideAppr.mutate({ id: r.id, kind: "material", status: v.status, decided_by: v.by, customer_comment: v.comment || null, rejection_reason: v.reason || null })} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="font-semibold">{t("اعتماد عينات الألوان", "Colour sample approvals")}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input placeholder={t("اسم اللون", "Colour")} value={col.color_name} onChange={(e) => setCol({ ...col, color_name: e.target.value })} />
              <Input placeholder={t("الرمز", "Code")} dir="ltr" value={col.color_code} onChange={(e) => setCol({ ...col, color_code: e.target.value })} />
              <Input placeholder={t("نوع التشطيب", "Finish")} value={col.finish_type} onChange={(e) => setCol({ ...col, finish_type: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UploadButton projectId={projectId} kind="colors" label={col.object_path ? t("تم إرفاق ملف", "File attached") : t("إرفاق عينة", "Attach sample")} onUploaded={(p) => setCol({ ...col, object_path: p })} />
              <Button size="sm" className="gap-1 gradient-primary" disabled={!col.color_name.trim()} onClick={() => mCol.mutate()}><Plus className="h-4 w-4" />{t("إرسال للاعتماد", "Submit")}</Button>
            </div>
            <Table>
              <TableBody>
                {(colors.data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.color_name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{[r.color_code, r.finish_type].filter(Boolean).join(" · ") || "—"}</div>
                    </TableCell>
                    <TableCell><StatusChip value={r.status} map={APPROVAL_STATUS} /></TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <ViewFileButton path={r.object_path} label={t("عرض", "View")} />
                      {(r.status === "draft" || r.status === "submitted") && (
                        <DecideDialog onDecide={(v) => mDecideAppr.mutate({ id: r.id, kind: "color", status: v.status, decided_by: v.by, customer_comment: v.comment || null, rejection_reason: v.reason || null })} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

