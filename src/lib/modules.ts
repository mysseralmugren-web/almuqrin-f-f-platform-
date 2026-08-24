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
  Plug,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "./auth";

export interface ModuleDef {
  key: string;
  path: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  roles?: Role[]; // undefined = all authenticated
  group: "core" | "operations" | "commercial" | "finance" | "system";
}

export const MODULES: ModuleDef[] = [
  { key: "dashboard", path: "/dashboard", labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, group: "core" },
  { key: "admin", path: "/admin/users", labelAr: "المستخدمون والأدوار", labelEn: "Users & Roles", icon: ShieldCheck, group: "system", roles: ["super_admin", "factory_owner", "general_manager"] },
  { key: "erp", path: "/erp", labelAr: "تخطيط الموارد ERP", labelEn: "ERP", icon: Boxes, group: "operations" },
  { key: "mes", path: "/mes", labelAr: "التصنيع MES", labelEn: "Manufacturing", icon: Factory, group: "operations" },
  { key: "wms", path: "/wms", labelAr: "المستودعات WMS", labelEn: "Warehouse", icon: Warehouse, group: "operations" },
  { key: "inventory", path: "/inventory", labelAr: "المخزون", labelEn: "Inventory", icon: Package, group: "operations" },
  { key: "projects", path: "/projects", labelAr: "المشاريع والتركيب", labelEn: "Projects & Installation", icon: ClipboardList, group: "operations" },
  { key: "purchasing", path: "/purchasing", labelAr: "المشتريات", labelEn: "Purchasing", icon: ShoppingCart, group: "commercial" },
  { key: "sales", path: "/sales", labelAr: "المبيعات", labelEn: "Sales", icon: TrendingUp, group: "commercial" },
  { key: "quotations", path: "/quotations", labelAr: "عروض الأسعار", labelEn: "Quotations", icon: FileText, group: "commercial" },
  { key: "invoices", path: "/invoices", labelAr: "الفواتير الضريبية", labelEn: "Tax Invoices", icon: FileText, group: "finance" },
  { key: "delivery", path: "/delivery-notes", labelAr: "محاضر التسليم", labelEn: "Delivery Notes", icon: Truck, group: "operations" },
  { key: "crm", path: "/crm/leads", labelAr: "إدارة العملاء CRM", labelEn: "CRM", icon: Users, group: "commercial" },
  { key: "customers", path: "/customers", labelAr: "العملاء", labelEn: "Customers", icon: UserSquare2, group: "commercial" },
  { key: "suppliers", path: "/suppliers", labelAr: "الموردون", labelEn: "Suppliers", icon: Truck, group: "commercial" },
  { key: "accounting", path: "/accounting", labelAr: "المحاسبة", labelEn: "Accounting", icon: Calculator, group: "finance", roles: ["super_admin", "factory_owner", "general_manager", "accountant"] },
  { key: "hr", path: "/hr", labelAr: "الموارد البشرية", labelEn: "Human Resources", icon: UserCog, group: "finance", roles: ["super_admin", "factory_owner", "general_manager", "hr"] },
  { key: "ai-assistant", path: "/ai-assistant", labelAr: "المساعد الذكي", labelEn: "AI Assistant", icon: Sparkles, group: "system" },
  { key: "documents", path: "/documents", labelAr: "مركز المستندات والهوية", labelEn: "Documents & Identity", icon: FileStack, group: "system" },
  { key: "integrations", path: "/integrations", labelAr: "التكاملات والإشعارات", labelEn: "Integrations & Notifications", icon: Plug, group: "system", roles: ["super_admin", "factory_owner", "general_manager", "sales_manager", "sales_employee", "project_manager"] },
  { key: "reports", path: "/reports", labelAr: "التقارير", labelEn: "Reports", icon: BarChart3, group: "system" },
  { key: "settings", path: "/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings, group: "system", roles: ["super_admin", "factory_owner", "general_manager"] },
];

export const GROUP_LABELS: Record<ModuleDef["group"], { ar: string; en: string }> = {
  core: { ar: "الرئيسية", en: "Overview" },
  operations: { ar: "العمليات", en: "Operations" },
  commercial: { ar: "التجارة", en: "Commercial" },
  finance: { ar: "المالية والإدارة", en: "Finance & Admin" },
  system: { ar: "النظام", en: "System" },
};
