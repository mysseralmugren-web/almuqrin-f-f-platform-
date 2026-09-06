import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-branding";

type Settings = { logo_url:string|null };

export function PlatformWatermark() {
  const { user } = useAuth();
  const brand = useTenantBrand();
  const [settings,setSettings]=useState<Settings|null>(null);
  useEffect(()=>{let alive=true;(async()=>{if(!user?.companyId)return;const {data}=await (supabase as any).from("watermark_settings").select("logo_url").eq("company_id",user.companyId).maybeSingle();if(alive)setSettings(data as Settings|null)})();return()=>{alive=false}},[user?.companyId]);
  const logo=settings?.logo_url || brand.logo;
  return <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-30 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-[-22deg] print:fixed" style={{opacity:.14}}><img src={logo} alt="" className="h-full w-full object-contain"/></div>;
}
