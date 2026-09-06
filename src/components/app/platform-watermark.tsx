import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-branding";

type Settings = { enabled:boolean; apply_platform_ui:boolean; logo_url:string|null; opacity:number; position:string };

export function PlatformWatermark() {
  const { user } = useAuth();
  const brand = useTenantBrand();
  const [settings,setSettings]=useState<Settings|null>(null);
  useEffect(()=>{let alive=true;(async()=>{if(!user?.companyId)return;const {data}=await (supabase as any).from("watermark_settings").select("enabled,apply_platform_ui,logo_url,opacity,position").eq("company_id",user.companyId).maybeSingle();if(alive)setSettings(data as Settings|null)})();return()=>{alive=false}},[user?.companyId]);
  if(!settings?.enabled || !settings.apply_platform_ui) return null;
  const opacity=Math.max(.02,Math.min(.25,Number(settings.opacity)||.1));
  const logo=settings.logo_url || brand.logo;
  const logoMark=<img src={logo} alt="" className="h-full w-full object-contain" />;
  if(settings.position==="repeat") return <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden print:fixed"><div className="absolute -inset-[30%] grid rotate-[-24deg] grid-cols-3 gap-x-24 gap-y-32" style={{opacity}}>{Array.from({length:30}).map((_,i)=><div key={i} className="h-16 w-16">{logoMark}</div>)}</div></div>;
  const classes=settings.position==="bottom_right"?"bottom-10 right-10":settings.position==="diagonal"?"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg]":"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  return <div aria-hidden className={`pointer-events-none fixed z-30 h-28 w-28 ${classes}`} style={{opacity}}>{logoMark}</div>;
}
