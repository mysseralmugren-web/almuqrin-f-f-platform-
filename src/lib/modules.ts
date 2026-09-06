import {
  LayoutDashboard,
  Boxes,
  Users,
  Factory,
  Warehouse,
  Package,
  ShoppingCart,
  TrendingUp,
  FileText,
  UserSquare2,
  Truck,
  Calculator,
  UserCog,
  Sparkles,
  BarChart3,
  Settings,
  ClipboardList,
  ShieldCheck,
  FileStack,
  FolderOpen,
  Plug,
  Palette,
  ScanSearch,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./auth";

export interface ModuleDef {
  key: string;
  path: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  roles?: Role[];
  group: "core" | "operations" | "commercial" | "finance" | "system";
}

export const MODULES: ModuleDef[] = [
  { key: "dashboard", path: "/dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, group: "core" },
  { key: "admin", path: "/admin/users", labelAr: "المستخدمون والأدوار", labelEn: "Users & Roles", icon: ShieldCheck, group: "system" },
  { key: "erp", path: "/erp", labelAr: "تخطيط الموارد ERP", labelEn: "ERP", icon: Boxes, group: "operations" },
  { key: "mes", path: "/mes", labelAr: "التصنيع MES", labelEn: "Manufacturing", icon: Factory, group: "operations" },
  { key: "wms", path: "/wms", labelAr: "المستودعات WMS", labelEn: "Warehouse", icon: Warehouse, group: "operations" },
  { key: "inventory", path: "/inventory", labelAr: "المخزون", labelEn: "Inventory", icon: Package, group: "operations" },
  { key: "projects", path: "/projects", labelAr: "المشاريع والتركيب", labelEn: "Projects & Installation", icon: ClipboardList, group: "operations" },
  { key: "purchasing", path: "/purchasing", labelAr: "المشتريات", labelEn: "Purchasing", icon: ShoppingCart, group: "commercial" },
  { key: "sales", path: "/sales", labelAr: "المبيعات", labelEn: "Sales", icon: TrendingUp, group: "commercial" },
  { key: "quotations", path: "/quotations", labelAr: "عروض الأسعار", labelEn: "Quotations", icon: FileText, group: "commercial" },
  { key: "marketing", path: "/marketing", labelAr: "مسؤول الإعلانات", labelEn: "Advertising Manager", icon: Megaphone, group: "commercial" },
  { key: "catalog-ingestion", path: "/catalog-ingestion", labelAr: "استخراج المتجر من PDF", labelEn: "PDF Catalog Ingestion", icon: ScanSearch, group: "commercial" },
  { key: "store-admin", path: "/store-admin", labelAr: "اعتماد المتجر", labelEn: "Store Approvals", icon: ShoppingCart, group: "commercial" },
  { key: "invoices", path: "/invoices", labelAr: "الفواتير الضريبية", labelEn: "Tax Invoices", icon: FileText, group: "finance" },
  { key: "delivery", path: "/delivery-notes", labelAr: "محاضر التسليم", labelEn: "Delivery Notes", icon: Truck, group: "operations" },
  { key: "crm", path: "/crm/leads", labelAr: "إدارة العملاء CRM", labelEn: "CRM", icon: Users, group: "commercial" },
  { key: "customers", path: "/customers", labelAr: "العملاء", labelEn: "Customers", icon: UserSquare2, group: "commercial" },
  { key: "suppliers", path: "/suppliers", labelAr: "الموردون", labelEn: "Suppliers", icon: Truck, group: "commercial" },
  { key: "accounting", path: "/accounting", labelAr: "المحاسبة", labelEn: "Accounting", icon: Calculator, group: "finance" },
  { key: "hr", path: "/hr", labelAr: "الموارد البشرية", labelEn: "Human Resources", icon: UserCog, group: "finance" },
  { key: "ai-assistant", path: "/ai-assistant", labelAr: "المساعد الذكي", labelEn: "AI Assistant", icon: Sparkles, group: "system" },
  { key: "documents", path: "/documents", labelAr: "مركز المستندات والهوية", labelEn: "Documents & Identity", icon: FileStack, group: "system" },
  { key: "branding", path: "/branding", labelAr: "هوية المصنع", labelEn: "Factory Branding", icon: Palette, group: "system" },
  { key: "files", path: "/files", labelAr: "الملفات والصور", labelEn: "Files & Images", icon: FolderOpen, group: "system" },
  { key: "integrations", path: "/integrations", labelAr: "التكاملات والإشعارات", labelEn: "Integrations & Notifications", icon: Plug, group: "system" },
  { key: "reports", path: "/reports", labelAr: "التقارير", labelEn: "Reports", icon: BarChart3, group: "system" },
  { key: "settings", path: "/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings, group: "system" },
];

export function moduleKeyForPath(pathname: string): string | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/delivery-notes")) return "delivery";
  if (/^\/documents\/[0-9a-f-]{36}$/i.test(pathname)) return "documents";
  const matches = MODULES.filter((m) => pathname === m.path || pathname.startsWith(`${m.path}/`)).sort((a,b)=>b.path.length-a.path.length);
  return matches[0]?.key ?? null;
}

export const GROUP_LABELS: Record<ModuleDef["group"], { ar: string; en: string }> = {
  core: { ar: "الرئيسية", en: "Overview" },
  operations: { ar: "العمليات", en: "Operations" },
  commercial: { ar: "التجارة", en: "Commercial" },
  finance: { ar: "المالية والإدارة", en: "Finance & Admin" },
  system: { ar: "النظام", en: "System" },
};