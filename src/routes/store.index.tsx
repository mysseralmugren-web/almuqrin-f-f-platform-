import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownLeft, Box, Check, ChevronLeft, Heart, Move3D, Search, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AtelierScene } from "@/components/storefront/atelier-scene";

type MediaItem={type?:string;url?:string;alt?:string};
type Product={product_id:string;public_slug:string;model_code:string;name_ar:string;description:string|null;category_slug:string|null;category_name_ar:string|null;price_with_vat:number;production_history_count:number;media:MediaItem[]|null};
const categories=[["bedrooms","غرف النوم"],["majlis-sofas","المجالس والكنب"],["offices","المكاتب"],["tables","الطاولات"],["chairs","الكراسي"],["storage","الخزائن والتخزين"],["custom","أثاث حسب الطلب"]];
const sar=new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",maximumFractionDigits:2});
const SEARCH_EDGE="https://vmswbmkkgvnjhznxbsdz.supabase.co/functions/v1/storefront-search";
export const Route=createFileRoute("/store/")({component:StoreHome});

function StoreHome(){
 const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[q,setQ]=useState(""),[category,setCategory]=useState(""),[intent,setIntent]=useState<string|null>(null),[favorites,setFavorites]=useState<string[]>([]);
 useEffect(()=>{const p=new URLSearchParams(location.search);setQ(p.get("q")??"");setCategory(p.get("category")??"")},[]);
 useEffect(()=>{let alive=true;setLoading(true);setIntent(null);(async()=>{try{if(q.trim()){const r=await fetch(SEARCH_EDGE,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q:q.trim()})});const b=await r.json();if(alive){setProducts((b.products??[]) as Product[]);setIntent(b.intent_ar??null)}}else{let query=(supabase as any).from("store_public_catalog").select("*").order("published_at",{ascending:false}).limit(60);if(category)query=query.eq("category_slug",category);const{data}=await query;if(alive)setProducts((data??[]) as Product[])}}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[q,category]);
 const mostProduced=useMemo(()=>[...products].sort((a,b)=>Number(b.production_history_count)-Number(a.production_history_count)).slice(0,4),[products]);
 const hero=products[0],heroImage=hero?.media?.find(m=>m.type!=="glb"&&m.type!=="usdz")?.url;
 function search(e:FormEvent<HTMLFormElement>){e.preventDefault();const value=String(new FormData(e.currentTarget).get("q")??"").trim();setCategory("");setQ(value);history.replaceState(null,"",value?`/store?q=${encodeURIComponent(value)}`:"/store")}
 function chooseCategory(slug:string){setQ("");setCategory(slug);history.replaceState(null,"",`/store?category=${slug}`)}
 function toggleFavorite(id:string){setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])}
 return <main className="relative overflow-hidden bg-[#071a2b] text-white">
  <div className="pointer-events-none fixed inset-0 -z-0"><div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#7c8a96]/10 blur-3xl"/><div className="absolute -left-40 top-[42%] h-[460px] w-[460px] rounded-full bg-slate-500/5 blur-3xl"/></div>

  <section className="relative isolate overflow-hidden border-b border-white/10">
   {heroImage&&<img src={heroImage} alt="" className="absolute inset-0 -z-30 h-full w-full object-cover opacity-[.2]"/>}
   <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(9,11,14,.98)_0%,rgba(9,11,14,.86)_48%,rgba(9,11,14,.55)_100%)]"/>
   <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-6 px-6 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-16">
    <div className="relative z-10">
     <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b9bec6]/25 bg-[#b9bec6]/10 px-4 py-2 text-xs text-[#dce1e5]"><Sparkles className="h-4 w-4"/> Showroom تفاعلي · تصنيع محلي</div>
     <h1 className="max-w-4xl text-4xl font-black leading-[1.2] sm:text-6xl lg:text-7xl">أثاث يُصنع لمساحتك،<br/><span className="text-white/35">وليس مجرد منتج جاهز.</span></h1>
     <p className="mt-6 max-w-2xl text-sm leading-8 text-white/55 sm:text-base">استعرض موديلات مصنع المقرن، افتح تفاصيل القطعة، شاهد المعاينة ثلاثية الأبعاد عند توفرها، ثم خصّص المقاس والخامة واللون قبل طلب السعر.</p>
     <div className="mt-8 flex flex-wrap gap-3"><a href="#models" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#c5cbd1]">اكتشف الموديلات <ArrowDownLeft className="h-4 w-4"/></a><a href="#custom" className="rounded-full border border-white/20 bg-white/[0.03] px-6 py-3 text-sm font-bold text-white/70 transition hover:border-[#b9bec6]/50 hover:text-white">تفصيل حسب الطلب</a></div>
     <div className="mt-12 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">{[["3D","معاينة التصميم"],["QC","جودة قبل النشر"],["KSA","تصنيع محلي"],["ERP","مرتبط بالمصنع"]].map(([a,b])=><div key={a} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur"><b className="text-base text-white">{a}</b><div className="mt-1 text-[11px] text-white/40">{b}</div></div>)}</div>
    </div>
    <div className="relative min-h-[360px] lg:min-h-[540px]"><AtelierScene image={heroImage}/><div className="absolute bottom-5 right-5 hidden items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/60 backdrop-blur sm:flex"><Move3D className="h-5 w-5 text-[#c5cbd1]"/><span>تجربة المنتج<br/><b className="text-white">قبل اعتماد الطلب</b></span></div></div>
   </div>
  </section>

  <section id="search" className="relative z-10 mx-auto max-w-7xl px-6 py-8">
   <form onSubmit={search} className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3 backdrop-blur md:flex-row"><div className="flex flex-1 items-center gap-3 px-3"><Search className="h-5 w-5 text-[#b9bec6]"/><input name="q" defaultValue={q} className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/25" placeholder="مثال: مكتب مدير أسود 240 سم مع أدراج جانبية"/></div><button className="rounded-2xl bg-[#b9bec6] px-7 py-3 text-sm font-black text-black transition hover:bg-[#c5cbd1]">بحث ذكي في الموديلات</button></form>
   {intent&&<div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50"><b className="text-white/75">فهم البحث:</b> {intent}</div>}
   <div id="categories" className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map(([slug,name])=><button key={slug} type="button" aria-pressed={category===slug} onClick={()=>chooseCategory(slug)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${category===slug?"border-[#b9bec6] bg-[#b9bec6] text-black":"border-white/10 bg-white/[0.025] text-white/50 hover:border-white/20 hover:text-white"}`}>{name}</button>)}</div>
  </section>

  <section id="models" className="relative z-10 mx-auto max-w-7xl px-6 py-14">
   <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold tracking-[.18em] text-[#b9bec6]">ALMUQRIN COLLECTION</div><h2 className="mt-2 text-3xl font-black">مختارات المتجر</h2></div><div className="text-xs text-white/30">افتح المنتج للتفاصيل والتخصيص</div></div>
   {loading?<div className="mt-8 text-sm text-white/40">جارٍ تحميل موديلات المصنع…</div>:products.length?<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((p,i)=><ProductCard key={p.product_id} product={p} featured={i===0&&!category&&!q} favorite={favorites.includes(p.product_id)} onFavorite={()=>toggleFavorite(p.product_id)}/>)}</div>:<div className="mt-8 rounded-[30px] border border-dashed border-white/15 bg-white/[0.02] p-12 text-center"><Wrench className="mx-auto h-10 w-10 text-[#b9bec6]"/><h3 className="mt-4 text-xl font-black">لا توجد موديلات منشورة مطابقة</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/35">المتجر لا يعرض أي منتج قبل اكتمال التصنيع، نجاح الجودة، واعتماد السعر والنشر من مدير المنصة.</p></div>}
  </section>

  {mostProduced.length>0&&<section className="relative z-10 mx-auto max-w-7xl px-6 py-10"><div className="rounded-[34px] border border-white/10 bg-[#0b2236] p-8 md:p-12"><div className="text-xs font-bold tracking-[.16em] text-[#b9bec6]">MOST PRODUCED</div><h2 className="mt-2 text-3xl font-black">موديلات أثبتت حضورها في المصنع</h2><div className="mt-8 grid gap-4 md:grid-cols-4">{mostProduced.map((p,i)=><Link key={p.product_id} to="/store/$slug" params={{slug:p.public_slug}} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:bg-white/[0.05]"><div className="text-3xl font-black text-[#b9bec6]">0{i+1}</div><div className="mt-4 font-black">{p.name_ar}</div><div className="mt-1 text-xs text-white/35">تم تصنيعه {p.production_history_count} مرة</div></Link>)}</div></div></section>}

  <section id="custom" className="relative z-10 mx-auto max-w-7xl px-6 py-14"><div className="overflow-hidden rounded-[38px] border border-[#b9bec6]/20 bg-[linear-gradient(135deg,#0b2236,#071a2b)] p-8 md:p-14"><div className="grid gap-8 lg:grid-cols-[1fr_.65fr] lg:items-end"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-bold text-[#c5cbd1]"><Sparkles className="h-4 w-4"/> أثاث حسب الطلب</div><h2 className="mt-3 text-3xl font-black md:text-5xl">عندك صورة أو فكرة؟ نحولها إلى قطعة قابلة للتصنيع.</h2><p className="mt-5 max-w-2xl leading-8 text-white/45">اختر أقرب موديل، أدخل المقاسات والخامات المطلوبة وارفع المرجع. يصل الطلب مباشرة لمنصة المقرن، ويبقى السعر النهائي بانتظار اعتماد المصنع.</p></div><a href="/store#models" className="inline-flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-[#c5cbd1]">ابدأ من موديل <ChevronLeft className="h-4 w-4"/></a></div></div></section>
 </main>
}

function ProductCard({product,featured,favorite,onFavorite}:{product:Product;featured:boolean;favorite:boolean;onFavorite:()=>void}){
 const image=product.media?.find(m=>m.type!=="glb"&&m.type!=="usdz")?.url;const has3d=product.media?.some(m=>m.type==="glb");
 return <article className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111419] ${featured?"sm:col-span-2 lg:row-span-2":""}`}>
  <button type="button" onClick={e=>{e.preventDefault();e.stopPropagation();onFavorite()}} className="absolute left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur transition hover:bg-black/60" aria-label="المفضلة"><Heart className={`h-4 w-4 ${favorite?"fill-white":""}`}/></button>
  {has3d&&<span className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-bold text-white/80 backdrop-blur"><Move3D className="h-3.5 w-3.5"/> 3D READY</span>}
  <Link to="/store/$slug" params={{slug:product.public_slug}} className="block h-full">
   <div className={`relative overflow-hidden bg-[#171a1f] ${featured?"min-h-[540px] lg:h-full":"aspect-[4/3]"}`}>{image?<img src={image} alt={product.name_ar} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"/>:<div className="flex h-full items-center justify-center"><Box className="h-14 w-14 text-white/15"/></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/15 to-transparent"/><span className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] text-white/55 backdrop-blur">{product.model_code}</span></div>
   <div className={`absolute inset-x-0 bottom-0 p-5 ${featured?"sm:p-7":""}`}><div className="text-[10px] font-semibold tracking-wide text-[#c5cbd1]">{product.category_name_ar??"من إنتاج مصنعنا"}</div><h3 className={`mt-2 font-black ${featured?"text-2xl sm:text-3xl":"text-xl"}`}>{product.name_ar}</h3><p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-6 text-white/45">{product.description??"موديل مصنع ومعتمد من مصنع المقرن."}</p><div className="mt-4 flex items-end justify-between gap-4"><div><div className="text-[10px] text-white/30">شامل الضريبة</div><div className="mt-1 text-lg font-black">{sar.format(Number(product.price_with_vat))}</div></div><div className="grid h-11 w-11 place-items-center rounded-full bg-white text-black transition group-hover:bg-[#c5cbd1]"><ChevronLeft className="h-4 w-4"/></div></div>{featured&&<div className="mt-5 hidden gap-3 border-t border-white/10 pt-4 text-[11px] text-white/40 sm:flex"><span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#c5cbd1]"/> قابل للتخصيص</span><span>صُنّع {product.production_history_count} مرة</span></div>}</div>
  </Link>
 </article>
}
