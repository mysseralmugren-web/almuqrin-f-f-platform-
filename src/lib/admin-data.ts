// Static demo data shared across the User & Role Management module.
// UI-only — no backend logic wired.

export const ROLES = [
  { key: "super_admin", ar: "مدير النظام", en: "Super Admin", users: 2, tone: "bg-primary/10 text-primary", level: "L1" },
  { key: "owner", ar: "مالك المصنع", en: "Factory Owner", users: 1, tone: "bg-accent/20 text-accent-foreground", level: "L1" },
  { key: "gm", ar: "المدير العام", en: "General Manager", users: 3, tone: "bg-primary/10 text-primary", level: "L2" },
  { key: "sales_mgr", ar: "مدير المبيعات", en: "Sales Manager", users: 4, tone: "bg-success/10 text-success", level: "L3" },
  { key: "sales_emp", ar: "موظف المبيعات", en: "Sales Employee", users: 18, tone: "bg-success/10 text-success", level: "L4" },
  { key: "prod_mgr", ar: "مدير الإنتاج", en: "Production Manager", users: 3, tone: "bg-warning/10 text-warning", level: "L3" },
  { key: "wh_mgr", ar: "مدير المستودعات", en: "Warehouse Manager", users: 2, tone: "bg-warning/10 text-warning", level: "L3" },
  { key: "purch_mgr", ar: "مدير المشتريات", en: "Purchasing Manager", users: 2, tone: "bg-warning/10 text-warning", level: "L3" },
  { key: "accountant", ar: "المحاسب", en: "Accountant", users: 5, tone: "bg-primary/10 text-primary", level: "L3" },
  { key: "hr_mgr", ar: "مدير الموارد البشرية", en: "HR Manager", users: 3, tone: "bg-primary/10 text-primary", level: "L3" },
  { key: "designer", ar: "المصمم", en: "Designer", users: 6, tone: "bg-accent/20 text-accent-foreground", level: "L4" },
  { key: "technician", ar: "الفني", en: "Technician", users: 24, tone: "bg-muted text-foreground", level: "L4" },
];

export const PERMISSIONS = [
  { key: "view", ar: "عرض", en: "View" },
  { key: "create", ar: "إنشاء", en: "Create" },
  { key: "edit", ar: "تعديل", en: "Edit" },
  { key: "delete", ar: "حذف", en: "Delete" },
  { key: "approve", ar: "موافقة", en: "Approve" },
  { key: "export", ar: "تصدير", en: "Export" },
] as const;

export const MODULES_LIST = [
  { ar: "لوحة التحكم", en: "Dashboard" },
  { ar: "ERP", en: "ERP" },
  { ar: "التصنيع MES", en: "Manufacturing" },
  { ar: "المستودعات WMS", en: "Warehouse" },
  { ar: "المخزون", en: "Inventory" },
  { ar: "المشتريات", en: "Purchasing" },
  { ar: "المبيعات", en: "Sales" },
  { ar: "عروض الأسعار", en: "Quotations" },
  { ar: "العملاء", en: "Customers" },
  { ar: "الموردون", en: "Suppliers" },
  { ar: "المحاسبة", en: "Accounting" },
  { ar: "الموارد البشرية", en: "HR" },
  { ar: "التقارير", en: "Reports" },
];

export const USERS = [
  { id: "U-001", name: "Faisal Al-Mugren", nameAr: "فيصل المقرن", username: "almuqrin_admin", role: "Super Admin", roleAr: "مدير النظام", branch: "الرياض - المقر الرئيسي", branchEn: "Riyadh HQ", status: "active", lastLogin: "2m", company: "AlMugren Furniture" },
  { id: "U-002", name: "Nawaf Al-Harbi", nameAr: "نواف الحربي", username: "nawaf_alharbi", role: "General Manager", roleAr: "المدير العام", branch: "الرياض - المقر الرئيسي", branchEn: "Riyadh HQ", status: "active", lastLogin: "1h", company: "AlMugren Furniture" },
  { id: "U-003", name: "Sara Al-Otaibi", nameAr: "سارة العتيبي", username: "sara_alotaibi", role: "Sales Manager", roleAr: "مدير المبيعات", branch: "جدة", branchEn: "Jeddah", status: "active", lastLogin: "12m", company: "AlMugren Furniture" },
  { id: "U-004", name: "Mohammed Al-Zahrani", nameAr: "محمد الزهراني", username: "mohammed_alzahrani", role: "Production Manager", roleAr: "مدير الإنتاج", branch: "مصنع الخرج", branchEn: "Al-Kharj Plant", status: "active", lastLogin: "5m", company: "AlMugren Furniture" },
  { id: "U-005", name: "Layla Al-Ghamdi", nameAr: "ليلى الغامدي", username: "layla_alghamdi", role: "HR Manager", roleAr: "مدير الموارد البشرية", branch: "الرياض - المقر الرئيسي", branchEn: "Riyadh HQ", status: "active", lastLogin: "3h", company: "AlMugren Furniture" },
  { id: "U-006", name: "Khalid Al-Dossari", nameAr: "خالد الدوسري", username: "khalid_aldossari", role: "Accountant", roleAr: "المحاسب", branch: "الرياض - المقر الرئيسي", branchEn: "Riyadh HQ", status: "disabled", lastLogin: "22d", company: "AlMugren Furniture" },
  { id: "U-007", name: "Ahmed Al-Qahtani", nameAr: "أحمد القحطاني", username: "ahmed_alqahtani", role: "Designer", roleAr: "المصمم", branch: "الدمام", branchEn: "Dammam", status: "active", lastLogin: "1d", company: "AlMugren Furniture" },
  { id: "U-008", name: "Reem Al-Sharif", nameAr: "ريم الشريف", username: "reem_alsharif", role: "Sales Employee", roleAr: "موظف المبيعات", branch: "جدة", branchEn: "Jeddah", status: "pending", lastLogin: "—", company: "AlMugren Furniture" },
  { id: "U-009", name: "Yousef Al-Malki", nameAr: "يوسف المالكي", username: "yousef_almalki", role: "Warehouse Manager", roleAr: "مدير المستودعات", branch: "مصنع الخرج", branchEn: "Al-Kharj Plant", status: "active", lastLogin: "40m", company: "AlMugren Furniture" },
  { id: "U-010", name: "Fahad Al-Anzi", nameAr: "فهد العنزي", username: "fahad_alanzi", role: "Technician", roleAr: "الفني", branch: "مصنع الخرج", branchEn: "Al-Kharj Plant", status: "active", lastLogin: "8m", company: "AlMugren Furniture" },
  { id: "U-011", name: "Turki Al-Shammari", nameAr: "تركي الشمري", username: "turki_alshammari", role: "Purchasing Manager", roleAr: "مدير المشتريات", branch: "الرياض - المقر الرئيسي", branchEn: "Riyadh HQ", status: "active", lastLogin: "35m", company: "AlMugren Furniture" },
];

export const COMPANIES = [
  {
    id: "C-001",
    ar: "مصنع ميسر عبدالرحمن المقرن للأثاث",
    en: "Almuqrin Furniture Factory",
    city: "Riyadh",
    cityAr: "الرياض",
    tenantType: "primary",
    users: 71,
    branches: 4,
    departments: 8,
    vat: "314488703200003",
    cr: "7052998890",
  },
  {
    id: "C-002",
    ar: "المقرن لتجارة الأخشاب",
    en: "AlMugren Timber Trading",
    city: "Dammam",
    cityAr: "الدمام",
    tenantType: "subsidiary",
    users: 12,
    branches: 1,
    departments: 3,
    vat: "3001XXXXXXXXX04",
    cr: "2050XXXXXX",
  },
  {
    id: "C-003",
    ar: "المقرن للتصميم الداخلي",
    en: "AlMugren Interior Design",
    city: "Jeddah",
    cityAr: "جدة",
    tenantType: "subsidiary",
    users: 9,
    branches: 1,
    departments: 2,
    vat: "3001XXXXXXXXX05",
    cr: "4030XXXXXX",
  },
];

export const BRANCHES = [
  { ar: "الرياض - المقر الرئيسي", en: "Riyadh - HQ", city: "Riyadh", employees: 84, type: "HQ" },
  { ar: "مصنع الخرج", en: "Al-Kharj Manufacturing Plant", city: "Al-Kharj", employees: 152, type: "Plant" },
  { ar: "جدة - فرع المبيعات", en: "Jeddah Sales Branch", city: "Jeddah", employees: 22, type: "Sales" },
  { ar: "الدمام - فرع المبيعات", en: "Dammam Sales Branch", city: "Dammam", employees: 14, type: "Sales" },
];

export const DEPARTMENTS = [
  { ar: "الإدارة التنفيذية", en: "Executive", head: "Faisal Al-Mugren", count: 5 },
  { ar: "المبيعات والتسويق", en: "Sales & Marketing", head: "Sara Al-Otaibi", count: 26 },
  { ar: "الإنتاج", en: "Production", head: "Mohammed Al-Zahrani", count: 84 },
  { ar: "المستودعات واللوجستيات", en: "Warehouse & Logistics", head: "Yousef Al-Malki", count: 31 },
  { ar: "التصميم", en: "Design Studio", head: "Ahmed Al-Qahtani", count: 12 },
  { ar: "المالية والمحاسبة", en: "Finance & Accounting", head: "Khalid Al-Dossari", count: 9 },
  { ar: "الموارد البشرية", en: "Human Resources", head: "Layla Al-Ghamdi", count: 6 },
  { ar: "تقنية المعلومات", en: "IT", head: "—", count: 4 },
];

export function initialsOf(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("");
}
