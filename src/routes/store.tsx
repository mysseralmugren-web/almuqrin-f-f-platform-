import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [{ title: "متجر مصنع المقرن للأثاث والديكور" }, { name: "description", content: "معرض تفاعلي لموديلات مصنع المقرن، مع التخصيص وطلب عرض السعر." }] }),
  component: StoreLayout,
});

const nav = [
  ["الرئيسية", "/store"], ["غرف النوم", "/store?category=bedrooms"], ["المجالس والكنب", "/store?category=majlis-sofas"],
  ["المكاتب", "/store?category=offices"], ["الطاولات", "/store?category=tables"], ["الكراسي", "/store?category=chairs"], ["الخزائن", "/store?category=storage"],
];

function StoreLayout() {
  return <div dir="rtl" className="min-h-screen bg-[#090b0e] text-white">
    <div className="border-b border-white/10 bg-[#0e1115] px-4 py-2 text-center text-[11px] text-white/55">تصنيع سعودي حسب الطلب • تصميم، تصنيع وتنفيذ داخل المملكة</div>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090b0e]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <Link to="/store" className="shrink-0">
          <div className="text-lg font-black tracking-wide">مصنع المقرن</div>
          <div className="text-[9px] tracking-[.18em] text-[#c9a66b]">للأثاث والديكور</div>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-5 text-xs font-semibold text-white/55 xl:flex">{nav.map(([label,to]) => <a key={to} href={to} className="whitespace-nowrap transition hover:text-white">{label}</a>)}</nav>
        <div className="flex gap-2">
          <a href="/store#search" aria-label="البحث" className="rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-white/65 transition hover:bg-white/[0.08]"><Search className="h-4 w-4" /></a>
          <button aria-label="المفضلة" className="rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-white/65 transition hover:bg-white/[0.08]"><Heart className="h-4 w-4" /></button>
          <Link to="/login" aria-label="الحساب" className="rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-white/65 transition hover:bg-white/[0.08]"><UserRound className="h-4 w-4" /></Link>
          <a href="/store#cart" aria-label="السلة" className="rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-white/65 transition hover:bg-white/[0.08]"><ShoppingBag className="h-4 w-4" /></a>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-white/5 px-4 py-2 xl:hidden"><nav className="flex w-max gap-5 text-[11px] font-semibold text-white/55">{nav.map(([label,to]) => <a key={to} href={to} className="hover:text-white">{label}</a>)}</nav></div>
    </header>
    <Outlet />
    <footer id="contact" className="border-t border-white/10 bg-[#0d1014] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3"><div><div className="text-2xl font-black">مصنع المقرن</div><p className="mt-3 text-sm leading-7 text-white/45">أثاث وديكور يُصمم ويُصنع حسب المساحة والمقاس والخامة، مرتبط مباشرة بمنصة إدارة المصنع.</p></div><div><b className="text-white/80">تواصل معنا</b><div className="mt-3 space-y-2 text-sm text-white/45"><a className="block" href="tel:0502227034">0502227034</a><a className="block" href="mailto:Almuqrin.f.f@gmail.com">Almuqrin.f.f@gmail.com</a><div>الرياض – حي السلي – شارع طريب</div></div></div><div><b className="text-white/80">سياسة السعر</b><p className="mt-3 text-sm leading-7 text-white/45">السعر المنشور هو سعر المتجر المعتمد. أي تعديل في المقاس أو الخامة أو الإكسسوارات يعاد تسعيره قبل الاعتماد.</p></div></div></footer>
  </div>;
}
