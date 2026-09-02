import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Search, ShoppingBag, UserRound } from "lucide-react";

export const Route = createFileRoute("/store")({
  head: () => ({ meta: [{ title: "متجر مصنع المقرن للأثاث والديكور" }, { name: "description", content: "موديلات أثاث صُممت وصُنعت فعليًا في مصنع المقرن، بأسعار متجر معتمدة من الإدارة." }] }),
  component: StoreLayout,
});

const nav = [
  ["الرئيسية", "/store"], ["غرف النوم", "/store?category=bedrooms"], ["المجالس والكنب", "/store?category=majlis-sofas"],
  ["المكاتب", "/store?category=offices"], ["الطاولات", "/store?category=tables"], ["الكراسي", "/store?category=chairs"],
  ["الخزائن", "/store?category=storage"],
];

function StoreLayout() {
  return <div dir="rtl" className="min-h-screen bg-[#f7f5f0] text-[#17212a]">
    <div className="bg-[#17212a] px-4 py-2 text-center text-xs text-white/80">تصنيع سعودي حسب الطلب • الأسعار المنشورة معتمدة من إدارة مصنع المقرن</div>
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f5f0]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <Link to="/store" className="shrink-0"><div className="text-xl font-black">مصنع المقرن</div><div className="text-[10px] tracking-[.16em] text-slate-500">للأثاث والديكور</div></Link>
        <nav className="hidden flex-1 items-center justify-center gap-4 text-sm font-semibold xl:flex">{nav.map(([label,to]) => <a key={to} href={to} className="whitespace-nowrap hover:text-[#8d7657]">{label}</a>)}</nav>
        <div className="flex gap-2"><a href="/store#search" aria-label="البحث" className="rounded-full border border-black/10 p-2.5"><Search className="h-4 w-4" /></a><Link to="/login" aria-label="الحساب" className="rounded-full border border-black/10 p-2.5"><UserRound className="h-4 w-4" /></Link><a href="/store#cart" aria-label="السلة" className="rounded-full border border-black/10 p-2.5"><ShoppingBag className="h-4 w-4" /></a></div>
      </div>
      <div className="overflow-x-auto border-t border-black/5 px-4 py-2 xl:hidden"><nav className="flex w-max gap-5 text-xs font-semibold">{nav.map(([label,to]) => <a key={to} href={to}>{label}</a>)}</nav></div>
    </header>
    <Outlet />
    <footer id="contact" className="mt-20 bg-[#17212a] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3"><div><div className="text-2xl font-black">مصنع المقرن</div><p className="mt-3 text-sm leading-7 text-white/65">أثاث وديكور يُصمم ويُصنع حسب المساحة والمقاس والخامة، مرتبط مباشرة بمنصة إدارة المصنع.</p></div><div><b>تواصل معنا</b><div className="mt-3 space-y-2 text-sm text-white/70"><a className="block" href="tel:0502227034">0502227034</a><a className="block" href="mailto:Almuqrin.f.f@gmail.com">Almuqrin.f.f@gmail.com</a><div>الرياض – حي السلي – شارع طريب</div></div></div><div><b>سياسة السعر</b><p className="mt-3 text-sm leading-7 text-white/65">السعر الظاهر هو سعر المتجر المعتمد. أي تعديل في المقاس أو الخامة أو الإكسسوارات يعاد تسعيره قبل الاعتماد.</p></div></div></footer>
  </div>;
}
