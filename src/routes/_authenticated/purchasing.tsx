import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, FileText, GitCompare, ClipboardList, PackageCheck, ReceiptText, Banknote, Undo2, Wallet } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing")({
  head: () => ({
    meta: [
      { title: "المشتريات · AlMugren AI Factory OS" },
      { name: "description", content: "Purchase requests, RFQ comparison, purchase orders, goods receipts, supplier invoices and payment requests." },
      { property: "og:title", content: "المشتريات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Purchase requests, RFQs, orders, receiving, supplier invoices and payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PurchasingLayout,
});

function PurchasingLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/purchasing", ar: "طلبات الشراء", en: "Requests", icon: FileText, exact: true },
    { to: "/purchasing/rfq", ar: "عروض الموردين", en: "RFQ", icon: GitCompare, exact: false },
    { to: "/purchasing/po", ar: "أوامر الشراء", en: "Orders", icon: ClipboardList, exact: false },
    { to: "/purchasing/grn", ar: "الاستلام", en: "Receiving", icon: PackageCheck, exact: false },
    { to: "/purchasing/invoices", ar: "فواتير الموردين", en: "Invoices", icon: ReceiptText, exact: false },
    { to: "/purchasing/payments", ar: "طلبات الدفع", en: "Payments", icon: Banknote, exact: false },
    { to: "/purchasing/returns", ar: "المرتجعات", en: "Returns", icon: Undo2, exact: false },
    { to: "/purchasing/accounts", ar: "حسابات الموردين", en: "Accounts", icon: Wallet, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <ShoppingCart className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 05", "Module 05")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">{t("المشتريات والموردون", "Purchasing")}</h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-1.5">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {t(tab.ar, tab.en)}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

