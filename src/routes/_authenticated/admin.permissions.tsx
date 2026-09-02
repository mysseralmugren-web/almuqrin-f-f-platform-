import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type Role } from "@/lib/auth";
import { MODULES } from "@/lib/modules";
import { useModulePermissions } from "@/lib/module-permissions";

export const Route = createFileRoute("/_authenticated/admin/permissions")({ head:()=>({meta:[{title:"صلاحيات الأدوار · منصة المقرن"}]}), component:PermissionsPage });
type Action="can_view"|"can_create"|"can_edit"|"can_approve"|"can_delete"|"can_export";
type Row={module_key:string;can_view:boolean;can_create:boolean;can_edit:boolean;can_approve:boolean;can_delete:boolean;can_export:boolean};
const actions:[Action,string][]=[["can_view","عرض"],["can_create","إنشاء"],["can_edit","تعديل"],["can_approve","اعتماد"],["can_delete","حذف"],["can_export","تصدير"]];
const roles=Object.keys(ROLE_LABELS) as Role[];
function PermissionsPage(){
 const {user}=useAuth(); const {refresh}=useModulePermissions(); const [role,setRole]=useState<Role>("sales_employee"); const [rows,setRows]=useState<Record<string,Row>>({}); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false);
 useEffect(()=>{void load()},[role,user?.companyId]);
 async function load(){if(!user?.companyId)return;setLoading(true);const {data,error}=await (supabase as any).from("role_module_permissions").select("module_key,can_view,can_create,can_edit,can_approve,can_delete,can_export").eq("company_id",user.companyId).eq("role",role);setLoading(false);if(error){toast.error(error.message);return}const map:Record<string,Row>={};for(const r of data??[])map[r.module_key]=r;setRows(map)}
 function toggle(moduleKey:string,action:Action,value:boolean){setRows(cur=>{const base=cur[moduleKey]??{module_key:moduleKey,can_view:false,can_create:false,can_edit:false,can_approve:false,can_delete:false,can_export:false};return {...cur,[moduleKey]:{...base,[action]:value,...(action!=="can_view"&&value?{can_view:true}:{})}}})}
 async function save(){if(!user?.companyId)return;setSaving(true);const payload=MODULES.map(m=>({company_id:user.companyId,role,module_key:m.key,...(rows[m.key]??{can_view:false,can_create:false,can_edit:false,can_approve:false,can_delete:false,can_export:false}),updated_at:new Date().toISOString()}));const {error}=await (supabase as any).from("role_module_permissions").upsert(payload,{onConflict:"company_id,role,module_key"});setSaving(false);if(error){toast.error(error.message);return}await refresh();toast.success("تم حفظ صلاحيات الدور وتطبيقها على اللوحات")}
 const enabled=useMemo(()=>Object.values(rows).filter(r=>r.can_view).length,[rows]);
 return <Card className="shadow-card"><CardHeader><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>مصفوفة صلاحيات لوحات العمل</CardTitle><CardDescription className="mt-2">هذه الصلاحيات تتحكم فعليًا في ظهور القائمة والوصول المباشر لكل لوحة داخل منصة المقرن.</CardDescription></div><div className="flex flex-wrap gap-2"><Select value={role} onValueChange={v=>setRole(v as Role)}><SelectTrigger className="w-56"><SelectValue/></SelectTrigger><SelectContent>{roles.map(r=><SelectItem key={r} value={r}>{ROLE_LABELS[r].ar}</SelectItem>)}</SelectContent></Select><Button onClick={save} disabled={saving||loading}>حفظ وتطبيق</Button></div></div></CardHeader><CardContent className="p-0"><div className="border-y px-5 py-3 text-xs text-muted-foreground">الدور: <b>{ROLE_LABELS[role].ar}</b> • اللوحات الظاهرة: <b>{enabled}</b> من {MODULES.length}</div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-[220px]">لوحة العمل</TableHead>{actions.map(([,label])=><TableHead key={label} className="text-center">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{MODULES.map(m=>{const r=rows[m.key]??{module_key:m.key,can_view:false,can_create:false,can_edit:false,can_approve:false,can_delete:false,can_export:false};return <TableRow key={m.key}><TableCell><div className="font-medium">{m.labelAr}</div><div className="text-[11px] text-muted-foreground">{m.key}</div></TableCell>{actions.map(([a])=><TableCell key={a} className="text-center"><Checkbox checked={r[a]} onCheckedChange={v=>toggle(m.key,a,v===true)}/></TableCell>)}</TableRow>})}</TableBody></Table></div></CardContent></Card>
}
