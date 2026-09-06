import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, Download, Eye, FileImage, FileText, FolderOpen, Loader2, RotateCcw, Search, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, CATALOG_PDF_MAX_BYTES, DEFAULT_ATTACHMENT_MAX_BYTES, createAttachmentUploadUrl, getAttachmentUrl, listFileCenter, registerAttachment, updateAttachment } from "@/lib/attachments.functions";
import { useT } from "@/lib/theme";

export const Route=createFileRoute("/_authenticated/files")({component:FilesCenter,head:()=>({meta:[{title:"الملفات والصور · منصة المقرن"}]})});
type Category="plans"|"contracts"|"invoices"|"site_photos"|"designs"|"other";
type UploadItem={id:string;file:File;progress:number;status:"ready"|"processing"|"uploading"|"done"|"error";error?:string};
const categories:{value:Category;ar:string;en:string}[]=[{value:"plans",ar:"مخططات",en:"Plans"},{value:"contracts",ar:"عقود",en:"Contracts"},{value:"invoices",ar:"فواتير",en:"Invoices"},{value:"site_photos",ar:"صور الموقع",en:"Site photos"},{value:"designs",ar:"تصاميم",en:"Designs"},{value:"other",ar:"أخرى",en:"Other"}];
const isCatalogPdf=(file:File)=>file.type==="application/pdf"||/\.pdf$/i.test(file.name);
const maxFor=(file:File)=>isCatalogPdf(file)?CATALOG_PDF_MAX_BYTES:DEFAULT_ATTACHMENT_MAX_BYTES;
const tooLargeMessage=(file:File,t:(ar:string,en:string)=>string)=>isCatalogPdf(file)?t("ملف PDF الخاص بالكتالوج أكبر من 200 م.ب","Catalog PDF exceeds 200 MB"):t("الملف أكبر من 50 م.ب","File exceeds 50 MB");
const size=(n:number)=>n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
async function hash(file:File){const h=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function compress(file:File){if(!file.type.startsWith("image/")||file.size<1200000||file.type==="image/webp")return file;const b=await createImageBitmap(file),r=Math.min(1,2200/Math.max(b.width,b.height)),c=document.createElement("canvas");c.width=Math.round(b.width*r);c.height=Math.round(b.height*r);c.getContext("2d")!.drawImage(b,0,0,c.width,c.height);b.close();const blob=await new Promise<Blob>((ok,no)=>c.toBlob(x=>x?ok(x):no(new Error("IMAGE_COMPRESSION_FAILED")),"image/webp",.84));return blob.size<file.size?new File([blob],file.name.replace(/\.[^.]+$/,".webp"),{type:"image/webp"}):file}

const encodeMetadata=(value:string)=>btoa(unescape(encodeURIComponent(value)));
const wait=(ms:number)=>new Promise(resolve=>window.setTimeout(resolve,ms));
async function withRetry(run:()=>Promise<void>,onRetry:(attempt:number)=>void,maxAttempts=3){
 let last:unknown;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  try{return await run()}catch(error){last=error;if(attempt===maxAttempts)break;onRetry(attempt);await wait(900*attempt)}
 }
 throw last instanceof Error?last:new Error("UPLOAD_FAILED");
}
async function uploadSigned(signedUrl:string,file:File,onProgress:(progress:number)=>void){
 await new Promise<void>((resolve,reject)=>{
  const request=new XMLHttpRequest();
  // Keep the signed URL host issued by Storage. Some mobile networks stall when it is rewritten to a different hostname.
  request.open("PUT",signedUrl);
  request.timeout=120000;
  request.setRequestHeader("x-upsert","false");
  if(file.type)request.setRequestHeader("content-type",file.type);
  request.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.min(90,20+Math.round(event.loaded/event.total*70)))};
  request.onerror=()=>reject(new Error("SIGNED_UPLOAD_NETWORK_FAILED"));
  request.ontimeout=()=>reject(new Error("SIGNED_UPLOAD_TIMEOUT"));
  request.onabort=()=>reject(new Error("SIGNED_UPLOAD_ABORTED"));
  request.onload=()=>request.status>=200&&request.status<300?resolve():reject(new Error(`SIGNED_UPLOAD_FAILED: ${request.status}`));
  request.send(file);
 });
}
async function uploadResumable(path:string,token:string,signedUrl:string,file:File,onProgress:(progress:number)=>void){
 const signed=new URL(signedUrl);
 const host=signed.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
 const endpoint=`${signed.protocol}//${host}/storage/v1/upload/resumable`;
 const {data:{session}}=await supabase.auth.getSession();
 const auth=session?.access_token?{authorization:`Bearer ${session.access_token}`} : {};
 const creation=await fetch(endpoint,{method:"POST",headers:{"tus-resumable":"1.0.0","upload-length":String(file.size),"upload-metadata":[`bucketName ${encodeMetadata(BUCKET)}`,`objectName ${encodeMetadata(path)}`,`contentType ${encodeMetadata(file.type||"application/octet-stream")}`].join(","),"x-signature":token,...auth}});
 if(!creation.ok)throw new Error(`RESUMABLE_UPLOAD_CREATE_FAILED: ${creation.status} ${await creation.text()}`);
 const location=creation.headers.get("location");
 if(!location)throw new Error("RESUMABLE_UPLOAD_LOCATION_MISSING");
 const uploadUrl=new URL(location,endpoint).toString();
 const chunkSize=6*1024*1024; let offset=0;
 while(offset<file.size){
  const chunk=file.slice(offset,Math.min(offset+chunkSize,file.size));
  const response=await fetch(uploadUrl,{method:"PATCH",headers:{"tus-resumable":"1.0.0","upload-offset":String(offset),"content-type":"application/offset+octet-stream","x-signature":token,...auth},body:chunk});
  if(!response.ok)throw new Error(`RESUMABLE_UPLOAD_CHUNK_FAILED: ${response.status} ${await response.text()}`);
  const next=Number(response.headers.get("upload-offset"));
  offset=Number.isFinite(next)&&next>offset?next:offset+chunk.size;
  onProgress(Math.min(80,45+Math.round(offset/file.size*35)));
 }
}

function FilesCenter(){
 const t=useT(),qc=useQueryClient(),input=useRef<HTMLInputElement>(null),camera=useRef<HTMLInputElement>(null);const list=useServerFn(listFileCenter),signed=useServerFn(createAttachmentUploadUrl),register=useServerFn(registerAttachment),url=useServerFn(getAttachmentUrl),update=useServerFn(updateAttachment);
 const {data:files=[],isLoading}=useQuery({queryKey:["file-center"],queryFn:()=>list({})});const [queue,setQueue]=useState<UploadItem[]>([]),[category,setCategory]=useState<Category>("other"),[filter,setFilter]=useState("all"),[query,setQuery]=useState(""),[trash,setTrash]=useState(false),[drag,setDrag]=useState(false);
 const add=(incoming:File[])=>setQueue(q=>[...q,...incoming.map(file=>({id:crypto.randomUUID(),file,progress:0,status:file.size>maxFor(file)?"error" as const:"ready" as const,error:file.size>maxFor(file)?tooLargeMessage(file,t):undefined}))]);const patch=(id:string,p:Partial<UploadItem>)=>setQueue(q=>q.map(x=>x.id===id?{...x,...p}:x));
 const upload=useMutation({mutationFn:async()=>{
  const uploadOne=async(item:UploadItem)=>{
   if(item.file.size>maxFor(item.file))return;
   try{
    patch(item.id,{status:"processing",progress:10,error:undefined,stage:t("تجهيز الملف بأمان…","Preparing file securely…")});
    const f=await compress(item.file),checksum=await hash(f);
    const exists=(files as any[]).some(x=>x.checksum===checksum&&!x.deleted_at);
    if(exists)throw new Error(t("هذا الملف مرفوع مسبقًا","Duplicate file"));
    const s=await signed({data:{entity:"file_center",entity_id:crypto.randomUUID(),file_name:f.name,content_type:f.type||null,size_bytes:f.size}});
    patch(item.id,{status:"uploading",progress:20,stage:t("يُرفع الآن…","Uploading now…")});
    if(f.size>DEFAULT_ATTACHMENT_MAX_BYTES){
     try{await withRetry(()=>uploadSigned(s.signed_url,f,progress=>patch(item.id,{progress})),attempt=>patch(item.id,{stage:t(`إعادة المحاولة ${attempt}/2…`,`Retrying ${attempt}/2…`)}))}
     catch{await withRetry(()=>uploadResumable(s.path,s.token,s.signed_url,f,progress=>patch(item.id,{progress})),attempt=>patch(item.id,{stage:t(`استئناف الرفع ${attempt}/2…`,`Resuming upload ${attempt}/2…`)}))}
    }else{
     try{await withRetry(()=>uploadSigned(s.signed_url,f,progress=>patch(item.id,{progress})),attempt=>patch(item.id,{stage:t(`إعادة المحاولة ${attempt}/2…`,`Retrying ${attempt}/2…`)}))}
     catch{const {error}=await supabase.storage.from(BUCKET).uploadToSignedUrl(s.path,s.token,f);if(error)throw error;patch(item.id,{progress:90})}
    }
    await register({data:{entity:"file_center",entity_id:crypto.randomUUID(),object_path:s.path,file_name:item.file.name,content_type:f.type,size_bytes:f.size,title:item.file.name.replace(/\.[^.]+$/, ""),category,checksum}});
    patch(item.id,{status:"done",progress:100,stage:t("اكتمل الرفع","Upload complete")});
   }catch(e){const code=e instanceof Error?e.message:String(e);const message=code.includes("TIMEOUT")?t("انتهت مهلة الرفع. أعد المحاولة وسيستأنف النظام بصورة آمنة.","Upload timed out. Retry safely."):code.includes("NETWORK")?t("انقطع اتصال الرفع. تحقق من الشبكة ثم أعد المحاولة.","Upload connection was interrupted. Check the network and retry."):code;patch(item.id,{status:"error",progress:0,error:message,stage:t("تحتاج إعادة محاولة","Retry needed")})}
  };
  const pending=queue.filter(x=>x.status!=="done");
  // Serial uploads are more reliable on mobile and avoid two large PDFs competing for the same radio connection.
  for(const item of pending)await uploadOne(item);
 },onSuccess:()=>{void qc.invalidateQueries({queryKey:["file-center"]});toast.success(t("اكتمل رفع الملفات","Uploads completed"))}});

 const change=useMutation({mutationFn:(data:{id:string;deleted_at:string|null})=>update({data}),onSuccess:()=>void qc.invalidateQueries({queryKey:["file-center"]})});
 const shown=(files as any[]).filter(f=>Boolean(f.deleted_at)===trash&&(filter==="all"||f.category===filter)&&`${f.title||f.file_name} ${f.file_name}`.toLowerCase().includes(query.toLowerCase()));
 async function open(a:any,download=false){const x=await url({data:{attachment_id:a.id}});if(download){const link=document.createElement("a");link.href=x.url;link.download=a.file_name;link.click()}else window.open(x.url,"_blank","noopener")}
 return <div className="space-y-6" dir="rtl"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-primary">{t("مركز الملفات","File center")}</p><h1 className="mt-1 text-3xl font-bold">{t("كل ملفات المشروع في مكان واحد","Every project file in one place")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("رفع متعدد، ضغط تلقائي، معاينة وتصنيف آمن.","Bulk upload, automatic compression, secure preview and organization.")}</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>camera.current?.click()}><Camera className="h-4 w-4"/>{t("الكاميرا","Camera")}</Button><Button onClick={()=>input.current?.click()}><UploadCloud className="h-4 w-4"/>{t("رفع ملفات","Upload files")}</Button></div></div>
 <input ref={input} hidden type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e=>add([...e.target.files||[]])}/><input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={e=>add([...e.target.files||[]])}/>
 <div className="grid gap-3 sm:grid-cols-3"><Stat icon={<FolderOpen/>} label={t("إجمالي الملفات","Total files")} value={(files as any[]).filter(x=>!x.deleted_at).length}/><Stat icon={<FileImage/>} label={t("الصور","Images")} value={(files as any[]).filter(x=>!x.deleted_at&&x.content_type?.startsWith("image/")).length}/><Stat icon={<Trash2/>} label={t("سلة المحذوفات","Trash")} value={(files as any[]).filter(x=>x.deleted_at).length}/></div>
 <Card className={`border-2 border-dashed transition ${drag?"border-primary bg-primary/5":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);add([...e.dataTransfer.files])}}><CardContent className="py-9 text-center"><UploadCloud className="mx-auto mb-3 h-9 w-9 text-primary"/><p className="font-semibold">{t("اسحب الصور والملفات هنا","Drop files and images here")}</p><p className="mt-1 text-xs text-muted-foreground">{t("حتى 50 م.ب للملف، و200 م.ب لملف PDF الكتالوج","Up to 50 MB each, and 200 MB for catalog PDFs")}</p></CardContent></Card>
 {queue.length>0&&<Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{t("قائمة الرفع","Upload queue")} ({queue.length})</CardTitle><Button disabled={upload.isPending} onClick={()=>upload.mutate()}>{upload.isPending?<Loader2 className="animate-spin"/>:null}{t("بدء الرفع","Start upload")}</Button></CardHeader><CardContent className="space-y-3">{queue.map(x=><div key={x.id} className="flex items-center gap-3 rounded-lg border p-3"><FileIcon mime={x.file.type}/><div className="min-w-0 flex-1"><div className="flex justify-between text-sm"><span className="truncate font-medium">{x.file.name}</span><span>{size(x.file.size)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-muted"><div className={`h-full ${x.status==="error"?"bg-destructive":"bg-primary"}`} style={{width:`${x.status==="error"?100:x.progress}%`}}/></div>{x.stage&&x.status!=="error"&&<p className="mt-1 text-xs text-muted-foreground">{x.stage}</p>}{x.error&&<p className="mt-1 text-xs text-destructive">{x.error}</p>}</div>{x.status==="done"?<Check className="text-emerald-600"/>:<button onClick={()=>setQueue(q=>q.filter(i=>i.id!==x.id))}><X className="h-4 w-4"/></button>}</div>)}</CardContent></Card>}
 <Card><CardHeader><div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><div className="relative"><Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pr-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("ابحث باسم الملف","Search files")}/></div><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{t("كل التصنيفات","All categories")}</SelectItem>{categories.map(c=><SelectItem key={c.value} value={c.value}>{t(c.ar,c.en)}</SelectItem>)}</SelectContent></Select><Button variant={trash?"default":"outline"} onClick={()=>setTrash(v=>!v)}><Trash2 className="h-4 w-4"/>{t("سلة المحذوفات","Trash")}</Button></div></CardHeader><CardContent className="p-0">{isLoading?<div className="p-10 text-center"><Loader2 className="mx-auto animate-spin"/></div>:shown.length===0?<div className="p-10 text-center text-muted-foreground">{t("لا توجد ملفات","No files")}</div>:<div className="divide-y">{shown.map((a:any)=><div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><FileIcon mime={a.content_type||""}/><div className="min-w-0 flex-1"><p className="truncate font-medium">{a.title||a.file_name}</p><p className="text-xs text-muted-foreground">{t(categories.find(c=>c.value===a.category)?.ar||"أخرى",categories.find(c=>c.value===a.category)?.en||"Other")} • {size(a.size_bytes||0)} • {new Date(a.created_at).toLocaleDateString()}</p></div><div className="flex gap-1">{!trash&&<><Button size="icon" variant="ghost" aria-label={t("معاينة","Preview")} onClick={()=>open(a)}><Eye/></Button><Button size="icon" variant="ghost" aria-label={t("تنزيل","Download")} onClick={()=>open(a,true)}><Download/></Button></>}<Button size="icon" variant="ghost" aria-label={trash?t("استعادة","Restore"):t("حذف","Delete")} onClick={()=>change.mutate({id:a.id,deleted_at:trash?null:new Date().toISOString()})}>{trash?<RotateCcw/>:<Trash2 className="text-destructive"/>}</Button></div></div>)}</div>}</CardContent></Card>
 </div>
}
function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <Card><CardContent className="flex items-center gap-4 p-4"><span className="rounded-lg bg-primary/10 p-2 text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><b className="text-2xl">{value}</b><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>}
function FileIcon({mime}:{mime:string}){return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{mime.startsWith("image/")?<FileImage/>:<FileText/>}</span>}
