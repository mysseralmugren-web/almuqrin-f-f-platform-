import { createFileRoute } from "@tanstack/react-router";

const PLATFORMS=["META","TIKTOK","X"] as const;
type Platform=typeof PLATFORMS[number];
type Metric={externalCampaignId:string;campaignName:string;date:string;impressions:number;reach:number;clicks:number;leads:number;conversions:number;spend:number;attributedRevenue:number;raw:unknown};

function json(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is not configured`);return value}
function dateOnly(d:Date){return d.toISOString().slice(0,10)}
async function fetchJson(url:string,init?:RequestInit){const res=await fetch(url,{...init,cache:"no-store"});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(`Ads API ${res.status}: ${JSON.stringify(body)}`);return body}

async function authorize(request:Request){
  const header=request.headers.get("authorization")??"";const token=header.startsWith("Bearer ")?header.slice(7):"";
  if(!token)throw Object.assign(new Error("Unauthorized"),{status:401});
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const db=supabaseAdmin as any;
  const {data:{user},error}=await supabaseAdmin.auth.getUser(token);if(error||!user)throw Object.assign(new Error("Unauthorized"),{status:401});
  const {data:profile}=await db.from("profiles").select("company_id,is_active").eq("id",user.id).maybeSingle();if(!profile?.company_id||!profile.is_active)throw Object.assign(new Error("Active company profile required"),{status:403});
  const {data:roles}=await db.from("user_roles").select("role").eq("user_id",user.id).eq("company_id",profile.company_id);
  const allowed=new Set(["factory_owner","general_manager","sales"]);if(!(roles??[]).some((r:any)=>allowed.has(String(r.role))))throw Object.assign(new Error("Advertising manager permission required"),{status:403});
  return {db,companyId:String(profile.company_id),actorId:user.id};
}

async function metaMetrics(since:string,until:string):Promise<Metric[]>{
  const accountId=required("META_AD_ACCOUNT_ID");const token=required("META_AD_ACCESS_TOKEN");const version=process.env["META_GRAPH_API_VERSION"]?.trim()||"v23.0";
  const params=new URLSearchParams({access_token:token,level:"campaign",time_increment:"1",fields:"campaign_id,campaign_name,date_start,impressions,reach,clicks,spend,actions,action_values",time_range:JSON.stringify({since,until}),limit:"500"});
  const body=await fetchJson(`https://graph.facebook.com/${version}/act_${accountId}/insights?${params}`);
  return (body.data??[]).map((row:any)=>{const actions=Object.fromEntries((row.actions??[]).map((x:any)=>[x.action_type,Number(x.value||0)]));const values=Object.fromEntries((row.action_values??[]).map((x:any)=>[x.action_type,Number(x.value||0)]));return{externalCampaignId:String(row.campaign_id),campaignName:String(row.campaign_name||row.campaign_id),date:String(row.date_start),impressions:Number(row.impressions||0),reach:Number(row.reach||0),clicks:Number(row.clicks||0),leads:Number(actions.lead||actions.onsite_conversion_lead_grouped||0),conversions:Number(actions.purchase||actions.offsite_conversion_fb_pixel_purchase||0),spend:Number(row.spend||0),attributedRevenue:Number(values.purchase||values.offsite_conversion_fb_pixel_purchase||0),raw:row}});
}

async function tiktokMetrics(since:string,until:string):Promise<Metric[]>{
  const advertiserId=required("TIKTOK_ADVERTISER_ID");const token=required("TIKTOK_AD_ACCESS_TOKEN");
  const params=new URLSearchParams({advertiser_id:advertiserId,report_type:"BASIC",data_level:"AUCTION_CAMPAIGN",dimensions:JSON.stringify(["campaign_id","stat_time_day"]),metrics:JSON.stringify(["spend","impressions","reach","clicks","conversion","total_purchase_value"]),start_date:since,end_date:until,page_size:"1000"});
  const body=await fetchJson(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`,{headers:{"Access-Token":token}});if(body.code&&body.code!==0)throw new Error(`TikTok API ${body.code}: ${body.message||"unknown error"}`);
  return (body?.data?.list??[]).map((row:any)=>{const d=row.dimensions??{},m=row.metrics??{};return{externalCampaignId:String(d.campaign_id),campaignName:`TikTok ${String(d.campaign_id)}`,date:String(d.stat_time_day).slice(0,10),impressions:Number(m.impressions||0),reach:Number(m.reach||0),clicks:Number(m.clicks||0),leads:Number(m.conversion||0),conversions:Number(m.conversion||0),spend:Number(m.spend||0),attributedRevenue:Number(m.total_purchase_value||0),raw:row}});
}

async function xMetrics(since:string,until:string):Promise<Metric[]>{
  const endpoint=required("X_ADS_ANALYTICS_URL");const token=required("X_ADS_BEARER_TOKEN");const url=new URL(endpoint);url.searchParams.set("start_date",since);url.searchParams.set("end_date",until);
  const body=await fetchJson(url.toString(),{headers:{Authorization:`Bearer ${token}`}});const rows=Array.isArray(body?.data)?body.data:[];
  return rows.map((row:any)=>({externalCampaignId:String(row.campaign_id),campaignName:String(row.campaign_name||row.campaign_id),date:String(row.date).slice(0,10),impressions:Number(row.impressions||0),reach:Number(row.reach||0),clicks:Number(row.clicks||0),leads:Number(row.leads||0),conversions:Number(row.conversions||0),spend:Number(row.spend||0),attributedRevenue:Number(row.attributed_revenue||0),raw:row}));
}
async function fetchPlatform(p:Platform,since:string,until:string){return p==="META"?metaMetrics(since,until):p==="TIKTOK"?tiktokMetrics(since,until):xMetrics(since,until)}

async function ensureAccount(db:any,companyId:string,actorId:string,p:Platform){const id=p==="META"?process.env["META_AD_ACCOUNT_ID"]:p==="TIKTOK"?process.env["TIKTOK_ADVERTISER_ID"]:process.env["X_AD_ACCOUNT_ID"];if(!id)throw new Error(`${p} account id is not configured`);const {data,error}=await db.from("advertising_accounts").upsert({company_id:companyId,platform:p,account_id:id,account_name:p,is_active:true,connected_at:new Date().toISOString(),created_by:actorId},{onConflict:"company_id,platform,account_id"}).select("id").single();if(error)throw error;return data.id}

async function refreshRecommendations(db:any,companyId:string){
  const now=new Date(),start=new Date(now),split=new Date(now);start.setDate(start.getDate()-14);split.setDate(split.getDate()-7);const startDate=dateOnly(start),splitDate=dateOnly(split);
  const [{data:campaigns},{data:metrics}]=await Promise.all([db.from("advertising_campaigns").select("id,name").eq("company_id",companyId),db.from("advertising_daily_metrics").select("campaign_id,metric_date,impressions,clicks,leads,conversions,spend,attributed_revenue").eq("company_id",companyId).gte("metric_date",startDate)]);
  await db.from("advertising_recommendations").delete().eq("company_id",companyId).eq("status","OPEN");const inserts:any[]=[];
  const sum=(rows:any[])=>rows.reduce((a,r)=>({impressions:a.impressions+Number(r.impressions||0),clicks:a.clicks+Number(r.clicks||0),leads:a.leads+Number(r.leads||0),conversions:a.conversions+Number(r.conversions||0),spend:a.spend+Number(r.spend||0),revenue:a.revenue+Number(r.attributed_revenue||0)}),{impressions:0,clicks:0,leads:0,conversions:0,spend:0,revenue:0});
  const ratio=(x:any)=>({roas:x.spend?x.revenue/x.spend:0,ctr:x.impressions?x.clicks/x.impressions*100:0,cpl:x.leads?x.spend/x.leads:null});
  for(const c of campaigns??[]){const rows=(metrics??[]).filter((m:any)=>m.campaign_id===c.id);if(!rows.length)continue;const prev=ratio(sum(rows.filter((r:any)=>r.metric_date<splitDate))),recentTotals=sum(rows.filter((r:any)=>r.metric_date>=splitDate)),recent=ratio(recentTotals),based_on={previous7d:prev,recent7d:{...recent,...recentTotals}};const add=(type:string,priority:string,title:string,rationale:string)=>inserts.push({company_id:companyId,campaign_id:c.id,recommendation_type:type,priority,title:`${title} — ${c.name}`,rationale,based_on});
    if(recentTotals.spend>0&&recentTotals.clicks>0&&recentTotals.conversions===0)add("REVIEW_TRACKING","HIGH","فحص التتبع والتحويل","يوجد إنفاق ونقرات دون تحويلات في آخر 7 أيام؛ افحص Pixel/Events API قبل زيادة الميزانية.");
    if(prev.roas>0&&recent.roas>=prev.roas*1.2&&recentTotals.conversions>=2)add("SCALE","HIGH","مرشح لزيادة الميزانية","تحسن ROAS بأكثر من 20% مع تحويلات فعلية؛ يوصى بزيادة تدريجية ومراقبة العائد.");else if(prev.roas>0&&recent.roas<prev.roas*0.7&&recentTotals.spend>0)add("CHANGE_CREATIVE","HIGH","تراجع العائد","انخفض ROAS بأكثر من 30%؛ اختبر إبداعاً أو عرضاً جديداً قبل زيادة الإنفاق.");
    if(prev.cpl&&recent.cpl&&recent.cpl>prev.cpl*1.3)add("CHANGE_AUDIENCE","MEDIUM","ارتفاع تكلفة العميل المحتمل","ارتفع CPL بأكثر من 30%؛ اختبر جمهوراً جديداً مع تثبيت بقية المتغيرات.");
    if(recentTotals.impressions>=1000&&recent.ctr<0.7)add("CHANGE_CREATIVE","MEDIUM","تفاعل منخفض","CTR أقل من 0.7% مع حجم ظهور كافٍ؛ اختبر Hook وصورة أو فيديو وعنوان أقوى.");
    if(!inserts.some(x=>x.campaign_id===c.id)&&recentTotals.spend>0)add("CONTINUE","LOW","استمرار مع المراقبة","لا توجد إشارة قوية تستدعي تغييراً كبيراً؛ استمر مع مراقبة ROAS وCPL وCTR.");
  }
  if(inserts.length){const {error}=await db.from("advertising_recommendations").insert(inserts);if(error)throw error}return inserts.length;
}

export const Route=createFileRoute("/api/marketing/sync")({server:{handlers:{POST:async({request})=>{try{const {db,companyId,actorId}=await authorize(request);const body=await request.json().catch(()=>({}));const today=new Date(),from=new Date(today);from.setDate(from.getDate()-Math.max(1,Math.min(Number(body.days||30),90)));const since=body.since||dateOnly(from),until=body.until||dateOnly(today);const requested=Array.isArray(body.platforms)?body.platforms:PLATFORMS;const selected=PLATFORMS.filter(p=>requested.includes(p));const results:any[]=[];
  for(const p of selected){try{const accountId=await ensureAccount(db,companyId,actorId,p),rows=await fetchPlatform(p,since,until);let written=0;for(const row of rows){const {data:campaign,error:ce}=await db.from("advertising_campaigns").upsert({company_id:companyId,advertising_account_id:accountId,external_campaign_id:row.externalCampaignId,name:row.campaignName,status:"ACTIVE",created_by:actorId},{onConflict:"company_id,advertising_account_id,external_campaign_id"}).select("id").single();if(ce)throw ce;const {error:me}=await db.from("advertising_daily_metrics").upsert({company_id:companyId,campaign_id:campaign.id,metric_date:row.date,impressions:row.impressions,reach:row.reach,clicks:row.clicks,leads:row.leads,conversions:row.conversions,spend:row.spend,attributed_revenue:row.attributedRevenue,raw_payload:row.raw,synced_at:new Date().toISOString()},{onConflict:"company_id,campaign_id,metric_date"});if(me)throw me;written++}await db.from("advertising_accounts").update({last_synced_at:new Date().toISOString()}).eq("id",accountId);results.push({platform:p,rows:rows.length,metricsWritten:written})}catch(error){results.push({platform:p,error:error instanceof Error?error.message:String(error)})}}
  const generated=await refreshRecommendations(db,companyId);return json(200,{ok:true,since,until,results,recommendationsGenerated:generated})}catch(error:any){return json(error?.status||500,{ok:false,error:error?.message||"Sync failed"})}}}}});
