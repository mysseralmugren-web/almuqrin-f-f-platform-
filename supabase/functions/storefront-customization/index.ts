import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function text(form: FormData, key: string, max = 2000) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function numberOrNull(value: string) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
}
function safeExt(name: string) {
  return (name.split(".").pop() ?? "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
}
async function uploadFile(supabase: ReturnType<typeof createClient>, companyId: string, requestId: string, field: FormDataEntryValue | null, label: string) {
  if (!(field instanceof File) || field.size === 0) return null;
  if (field.size > MAX_FILE_SIZE || !ALLOWED.has(field.type)) throw new Error("INVALID_FILE");
  const path = `${companyId}/${requestId}/${label}-${crypto.randomUUID()}.${safeExt(field.name)}`;
  const bytes = new Uint8Array(await field.arrayBuffer());
  const { error } = await supabase.storage.from("store-customization").upload(path, bytes, { contentType: field.type, upsert: false });
  if (error) throw error;
  return path;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const form = await req.formData();
    if (text(form, "website", 200)) return json({ ok: true }, 200);
    const productId = text(form, "product_id", 80);
    const slug = text(form, "slug", 160);
    const phone = text(form, "phone", 80);
    const email = text(form, "email", 320);
    if (!productId || !slug || (!phone && !email)) return json({ error: "بيانات الطلب غير مكتملة" }, 400);

    const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:publicProduct,error:catalogError}=await supabase.from("store_public_catalog").select("product_id,public_slug").eq("product_id",productId).eq("public_slug",slug).maybeSingle();
    if(catalogError||!publicProduct)return json({error:"الموديل غير متاح"},404);

    const {data:product,error:productError}=await supabase.from("store_products").select("id,company_id,selling_mode,status,visibility").eq("id",productId).maybeSingle();
    if(productError||!product||product.status!=="published"||product.visibility!=="public"||!["customizable","both"].includes(product.selling_mode))return json({error:"الموديل غير متاح للتخصيص"},404);

    const requestId=crypto.randomUUID();
    const stamp=new Date().toISOString().slice(0,10).replaceAll("-","");
    const requestNo=`SCR-${stamp}-${requestId.slice(0,6).toUpperCase()}`;
    const roomPhoto=await uploadFile(supabase,product.company_id,requestId,form.get("room_photo"),"room");
    const plan=await uploadFile(supabase,product.company_id,requestId,form.get("plan"),"plan");
    const aiRequested=text(form,"ai_design",10)==="yes";

    const {error:insertError}=await supabase.from("store_customization_requests").insert({id:requestId,company_id:product.company_id,product_id:product.id,request_number:requestNo,full_name:text(form,"full_name",200)||null,phone:phone||null,email:email||null,width_mm:numberOrNull(text(form,"width_mm",30)),depth_mm:numberOrNull(text(form,"depth_mm",30)),height_mm:numberOrNull(text(form,"height_mm",30)),color:text(form,"color",200)||null,wood:text(form,"wood",300)||null,fabric:text(form,"fabric",300)||null,notes:text(form,"notes",4000)||null,attachment_paths:[roomPhoto,plan].filter(Boolean),room_photo_path:roomPhoto,plan_path:plan,room_measurements:{},ai_status:aiRequested?"queued":"not_requested",quote_status:"pending_factory_review"});
    if(insertError)throw insertError;

    await supabase.from("outbox_events").insert({company_id:product.company_id,topic:aiRequested?"store.customization.ai_requested":"store.customization.created",dedup_key:`store-customization:${requestId}`,payload:{request_id:requestId,product_id:product.id,request_number:requestNo,ai_requested:aiRequested}});
    await supabase.from("ai_manager_alerts").insert({company_id:product.company_id,alert_type:"store_customization_request",severity:"medium",title:aiRequested?"طلب تخصيص مع تصميم AI":"طلب تخصيص موديل",message:`وصل طلب متجر جديد ${requestNo} ويحتاج مراجعة المصنع وتسعيره.`,target_entity:"store_customization_requests",target_id:requestId,payload:{product_id:product.id,request_number:requestNo,ai_requested:aiRequested}});

    return json({ok:true,requestId,requestNumber:requestNo});
  } catch (error) {
    console.error("storefront-customization",error instanceof Error?error.message:"unknown");
    if(error instanceof Error&&error.message==="INVALID_FILE")return json({error:"الملف غير مدعوم أو يتجاوز 15MB"},400);
    return json({error:"تعذر إرسال الطلب"},500);
  }
});
