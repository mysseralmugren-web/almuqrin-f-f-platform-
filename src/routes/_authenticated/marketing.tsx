import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, BrainCircuit, DollarSign, Megaphone, MousePointerClick, RefreshCw, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/marketing")({ component: MarketingPage });

type PlatformRow={platform:string;spend:number;revenue:number;leads:number;conversions:number;impressions:number;clicks:number;ctr:number;cpl:number;roas:number};
type TrendRow={date:string;spend:number;revenue:number;leads:number};
type Recommendation={id:string;priority:string;title:string;rationale:string;recommendation_type:string};

type DashboardData={
  accounts:number;
  totals:{spend:number;revenue:number;leads:number;conversions:number;roas:number;ctr:number;cpl:number};
  platforms:PlatformRow[];
  trend:TrendRow[];
  recommendations:Recommendation[];
};

const empty:DashboardData={accounts:0,totals:{spend:0,revenue:0,leads:0,conversions:0,roas:0,ctr:0,cpl:0},platforms:[
  {platform:"Meta",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0},
  {platform:"TikTok",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0},
  {platform:"X",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0},
],trend:[],recommendations:[]};

const platformLabel:Record<string,string>={META:"Meta",TIKTOK:"TikTok",X:"X"};
function sar(n:number){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",maximumFractionDigits:0}).format(n||0)}

async function authFetch(path:string,init?:RequestInit){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token) throw new Error("انتهت جلسة الدخول");
  const headers=new Headers(init?.headers);headers.set("Authorization",`Bearer ${session.access_token}`);headers.set("Content-Type","application/json");
  return fetch(path,{...init,headers});
}

function MarketingPage(){
  const {user}=useAuth();
  const [data,setData]=useState<DashboardData>(empty);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [message,setMessage]=useState("");
  const [product,setProduct]=useState("");
  const [offer,setOffer]=useState("");
  const [audience,setAudience]=useState("عملاء الأثاث والديكور في السعودية");
  const [creative,setCreative]=useState<Record<string,unknown>|null>(null);
  const [generating,setGenerating]=useState(false);

  async function load(){
    if(!user?.companyId)return;
    setLoading(true);
    try{
      const since=new Date();since.setDate(since.getDate()-30);const sinceDate=since.toISOString().slice(0,10);
      const db=supabase as any;
      const [accountsResult,campaignResult,metricsResult,recsResult]=await Promise.all([
        db.from("advertising_accounts").select("id,platform,is_active").eq("company_id",user.companyId),
        db.from("advertising_campaigns").select("id,advertising_account_id").eq("company_id",user.companyId),
        db.from("advertising_daily_metrics").select("campaign_id,metric_date,impressions,clicks,leads,conversions,spend,attributed_revenue").eq("company_id",user.companyId).gte("metric_date",sinceDate).order("metric_date",{ascending:true}),
        db.from("advertising_recommendations").select("id,priority,title,rationale,recommendation_type").eq("company_id",user.companyId).eq("status","OPEN").order("created_at",{ascending:false}).limit(20),
      ]);
      for(const result of [accountsResult,campaignResult,metricsResult,recsResult])if(result.error)throw result.error;
      const accounts=accountsResult.data??[];const campaigns=campaignResult.data??[];const metrics=metricsResult.data??[];
      const accountPlatform=new Map(accounts.map((a:any)=>[a.id,a.platform]));
      const campaignPlatform=new Map(campaigns.map((c:any)=>[c.id,accountPlatform.get(c.advertising_account_id)]));
      const buckets:Record<string,PlatformRow>={META:{platform:"Meta",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0},TIKTOK:{platform:"TikTok",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0},X:{platform:"X",spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0,ctr:0,cpl:0,roas:0}};
      const trendMap=new Map<string,TrendRow>();
      for(const m of metrics){const key=campaignPlatform.get(m.campaign_id) as string|undefined;const b=key?buckets[key]:undefined;if(b){b.spend+=Number(m.spend||0);b.revenue+=Number(m.attributed_revenue||0);b.leads+=Number(m.leads||0);b.conversions+=Number(m.conversions||0);b.impressions+=Number(m.impressions||0);b.clicks+=Number(m.clicks||0)}const t=trendMap.get(m.metric_date)??{date:m.metric_date,spend:0,revenue:0,leads:0};t.spend+=Number(m.spend||0);t.revenue+=Number(m.attributed_revenue||0);t.leads+=Number(m.leads||0);trendMap.set(m.metric_date,t)}
      const platforms=Object.values(buckets).map(b=>({...b,ctr:b.impressions?b.clicks/b.impressions*100:0,cpl:b.leads?b.spend/b.leads:0,roas:b.spend?b.revenue/b.spend:0}));
      const totals=platforms.reduce((a,b)=>({spend:a.spend+b.spend,revenue:a.revenue+b.revenue,leads:a.leads+b.leads,conversions:a.conversions+b.conversions,impressions:a.impressions+b.impressions,clicks:a.clicks+b.clicks}),{spend:0,revenue:0,leads:0,conversions:0,impressions:0,clicks:0});
      setData({accounts:accounts.filter((a:any)=>a.is_active).length,totals:{spend:totals.spend,revenue:totals.revenue,leads:totals.leads,conversions:totals.conversions,roas:totals.spend?totals.revenue/totals.spend:0,ctr:totals.impressions?totals.clicks/totals.impressions*100:0,cpl:totals.leads?totals.spend/totals.leads:0},platforms,trend:Array.from(trendMap.values()),recommendations:recsResult.data??[]});
    }catch(error){setMessage(error instanceof Error?error.message:String(error))}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[user?.companyId]);

  async function sync(){setSyncing(true);setMessage("");try{const res=await authFetch("/api/marketing/sync",{method:"POST",body:JSON.stringify({days:30})});const json=await res.json();if(!res.ok)throw new Error(json.error||"فشلت المزامنة");const failed=(json.results??[]).filter((x:any)=>x.error);setMessage(failed.length?`تمت المزامنة جزئياً: ${failed.map((x:any)=>`${platformLabel[x.platform]??x.platform}: ${x.error}`).join(" | ")}`:"تم تحديث نتائج الحملات والتوصيات بنجاح.");await load()}catch(error){setMessage(error instanceof Error?error.message:String(error))}finally{setSyncing(false)}}
  async function generate(){if(!product.trim()){setMessage("أدخل اسم المنتج أو المشروع أولاً.");return}setGenerating(true);setMessage("");try{const res=await authFetch("/api/marketing/generate",{method:"POST",body:JSON.stringify({product,offer,audience,city:"الرياض",objective:"Leads"})});const json=await res.json();if(!res.ok)throw new Error(json.error||"تعذر إنشاء الإعلان");setCreative(json.creative)}catch(error){setMessage(error instanceof Error?error.message:String(error))}finally{setGenerating(false)}}

  const cards=useMemo(()=>[
    {label:"إجمالي الإنفاق",value:sar(data.totals.spend),icon:DollarSign},
    {label:"العملاء المحتملون",value:String(data.totals.leads),icon:Target},
    {label:"التحويلات",value:String(data.totals.conversions),icon:MousePointerClick},
    {label:"ROAS",value:`${data.totals.roas.toFixed(2)}x`,icon:TrendingUp},
  ],[data]);

  return <div dir="rtl" className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-2xl font-bold">مسؤول الإعلانات الذكي</h1><p className="mt-1 text-sm text-muted-foreground">تصميم ومتابعة وتحليل حملات Meta وTikTok وX وربط نتائجها بالقرارات التسويقية.</p></div><div className="flex flex-wrap gap-2"><div className="rounded-xl border bg-card px-4 py-3 text-sm">الحسابات المرتبطة: <b>{data.accounts}/3</b></div><button onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing?"animate-spin":""}`}/>{syncing?"جارٍ التحديث":"مزامنة النتائج"}</button></div></div>
    {message&&<div className="rounded-xl border bg-card p-3 text-sm">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-muted-foreground"/></div><div className="mt-3 text-2xl font-bold">{loading?"…":value}</div></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5"/><h2 className="font-bold">مقارنة المنصات — آخر 30 يوم</h2></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.platforms}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="platform"/><YAxis/><Tooltip/><Legend/><Bar dataKey="spend" name="الإنفاق" fill="currentColor" opacity={0.35}/><Bar dataKey="revenue" name="الإيراد المنسوب" fill="currentColor" opacity={0.85}/></BarChart></ResponsiveContainer></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{data.platforms.map(p=><div key={p.platform} className="rounded-xl border p-3 text-xs"><b>{p.platform}</b><div className="mt-1 text-muted-foreground">ROAS {p.roas.toFixed(2)}x · CTR {p.ctr.toFixed(2)}% · CPL {sar(p.cpl)}</div></div>)}</div></section>
    <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5"/><h2 className="font-bold">تطور الإنفاق والإيراد</h2></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="spend" name="الإنفاق" stroke="currentColor" strokeWidth={2}/><Line type="monotone" dataKey="revenue" name="الإيراد" stroke="currentColor" strokeWidth={2} strokeDasharray="5 5"/></LineChart></ResponsiveContainer></div></section></div>
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5"/><h2 className="font-bold">مصمم الإعلانات بالذكاء الاصطناعي</h2></div><div className="space-y-3"><input value={product} onChange={e=>setProduct(e.target.value)} placeholder="المنتج أو المشروع" className="w-full rounded-xl border bg-background px-3 py-2 text-sm"/><input value={offer} onChange={e=>setOffer(e.target.value)} placeholder="السعر أو العرض — اختياري" className="w-full rounded-xl border bg-background px-3 py-2 text-sm"/><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="الجمهور المستهدف" className="w-full rounded-xl border bg-background px-3 py-2 text-sm"/><button onClick={generate} disabled={generating} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{generating?"جارٍ إنشاء الحزمة…":"إنشاء إعلان لـ Meta + TikTok + X"}</button></div>{creative&&<pre dir="rtl" className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 text-xs">{JSON.stringify(creative,null,2)}</pre>}</section>
    <section className="rounded-2xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><BrainCircuit className="h-5 w-5"/><h2 className="font-bold">توصيات تطوير الحملات</h2></div>{data.recommendations.length===0?<p className="text-sm text-muted-foreground">تظهر التوصيات بعد مزامنة بيانات أداء كافية للمقارنة التاريخية.</p>:<div className="space-y-3">{data.recommendations.map(r=><div key={r.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><b className="text-sm">{r.title}</b><span className="rounded-full border px-2 py-1 text-xs">{r.priority}</span></div><p className="mt-2 text-sm text-muted-foreground">{r.rationale}</p></div>)}</div>}</section></div>
    <section className="rounded-2xl border bg-card p-5 shadow-sm"><h2 className="font-bold">مؤشرات القرار</h2><div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4 xl:grid-cols-8">{["Impressions","Reach","CTR","CPC","CPM","CPL","Conversion Rate","ROAS"].map(x=><div key={x} className="rounded-xl border p-3 text-center font-semibold">{x}</div>)}</div><p className="mt-4 text-sm text-muted-foreground">لا يتم رفع الميزانية لمجرد زيادة المشاهدات؛ القرار يعتمد على تكلفة العميل المحتمل، جودة التحويل، الإيراد المنسوب، ومقارنة الحملة بتاريخها السابق.</p></section>
  </div>;
}
