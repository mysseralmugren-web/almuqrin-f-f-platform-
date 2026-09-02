import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-branding";

type Settings = { enabled:boolean; apply_platform_ui:boolean; watermark_text:string; logo_url:string|null; opacity:number; position:string };

export function PlatformWatermark() {
  const { user } = useAuth();
  const brand = useTenantBrand();
  const [settings,setSettings]=useState<Settings|null>(null);
  useEffect(()=>{let alive=true;(async()=>{if(!user?.companyId)return;const {data}=await (supabase as any).from("watermark_settings").select("enabled,apply_platform_ui,watermark_text,logo_url,opacity,position").eq("company_id",user.companyId).maybeSingle();if(alive)setSettings(data as Settings|null)})();return()=>{alive=false}},[user?.companyId]);
  if(!settings?.enabled || !settings.apply_platform_ui) return null;
  const opacity=Math.max(.02,Math.min(.5,Number(settings.opacity)||.1));
  const text=settings.watermark_text || brand.nameAr;
  const logo=settings.logo_url || brand.logo;
  if(settings.position==="repeat") return <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden print:fixed"><div className="absolute -inset-[30%] grid rotate-[-24deg] grid-cols-3 gap-x-24 gap-y-32" style={{opacity}}>{Array.from({length:30}).map((_,i)=><div key={i} className="flex items-center gap-3 whitespace-nowrap text-xl font-black text-foreground"><img src={logo} alt="" className="h-9 w-9 object-contain"/>{text}</div>)}</div></div>;
  const classes=settings.position==="bottom_right"?"bottom-10 right-10":settings.position==="diagonal"?"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg]":"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  return <div aria-hidden className={`pointer-events-none fixed z-30 flex items-center gap-5 whitespace-nowrap ${classes}`} style={{opacity}}><img src={logo} alt="" className="h-24 w-24 object-contain"/><span className="text-4xl font-black text-foreground">{text}</span></div>;
}
