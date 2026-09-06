import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema=z.object({product:z.string().trim().min(1).max(300),offer:z.string().trim().max(300).optional().default(""),audience:z.string().trim().min(2).max(500).default("عملاء الأثاث والديكور في السعودية"),city:z.string().trim().max(100).default("الرياض"),objective:z.string().trim().max(100).default("Leads")});
function json(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}

async function authorize(request:Request){
  const token=(request.headers.get("authorization")??"").replace(/^Bearer\s+/i,"");if(!token)throw Object.assign(new Error("Unauthorized"),{status:401});
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const db=supabaseAdmin as any;const {data:{user},error}=await supabaseAdmin.auth.getUser(token);if(error||!user)throw Object.assign(new Error("Unauthorized"),{status:401});
  const {data:profile}=await db.from("profiles").select("company_id,is_active").eq("id",user.id).maybeSingle();if(!profile?.company_id||!profile.is_active)throw Object.assign(new Error("Active company profile required"),{status:403});
  const {data:roles}=await db.from("user_roles").select("role").eq("user_id",user.id).eq("company_id",profile.company_id);const allowed=new Set(["factory_owner","general_manager","sales"]);if(!(roles??[]).some((r:any)=>allowed.has(String(r.role))))throw Object.assign(new Error("Advertising manager permission required"),{status:403});return {companyId:String(profile.company_id)};
}

function extractText(body:any){for(const item of body?.output??[])for(const part of item?.content??[])if(part?.type==="output_text"&&typeof part.text==="string")return part.text;return ""}

export const Route=createFileRoute("/api/marketing/generate")({server:{handlers:{POST:async({request})=>{try{
  await authorize(request);const parsed=schema.parse(await request.json());const apiKey=process.env["OPENAI_API_KEY"]?.trim();if(!apiKey)return json(503,{error:"OPENAI_API_KEY is not configured"});
  const instructions="أنت مدير إعلانات لمصنع المقرن للأثاث والديكور في السعودية. صمم إعلانات احترافية موجهة للمبيعات والعملاء المحتملين. لا تخترع سعراً أو خصماً أو ضماناً غير موجود في المدخلات. أعد JSON فقط دون Markdown.";
  const input=JSON.stringify({product:parsed.product,offer:parsed.offer,audience:parsed.audience,city:parsed.city,objective:parsed.objective,platforms:["Meta","TikTok","X"],required_output:{strategy:"string",meta:{primary_text:"string",headline:"string",description:"string",cta:"string",visual_direction:"string"},tiktok:{hook:"string",script_15s:"string",caption:"string",cta:"string",shot_list:["string"]},x:{post:"string",cta:"string",visual_direction:"string"},hashtags:["string"],measurement_plan:["string"],ab_tests:[{variable:"string",version_a:"string",version_b:"string"}]}});
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env["OPENAI_MODEL"]?.trim()||"gpt-5-mini",store:false,instructions,input,text:{format:{type:"json_object"}}})});const body=await response.json().catch(()=>({}));if(!response.ok)return json(response.status,{error:body?.error?.message||"AI generation failed"});const text=extractText(body);if(!text)return json(502,{error:"AI returned no text output"});let creative:unknown;try{creative=JSON.parse(text)}catch{creative={raw:text}};return json(200,{creative});
}catch(error:any){if(error instanceof z.ZodError)return json(400,{error:"invalid_payload",details:error.flatten()});return json(error?.status||500,{error:error?.message||"Generation failed"})}}}}});
