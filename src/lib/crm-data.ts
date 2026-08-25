// Static demo data for Module 02 — CRM. UI-only, no backend logic.

export const PIPELINE_STAGES = [
  { key: "new", ar: "عميل محتمل", en: "New Lead", tone: "bg-muted text-foreground" },
  { key: "qualified", ar: "مؤهل", en: "Qualified", tone: "bg-primary/10 text-primary" },
  { key: "quote", ar: "عرض سعر", en: "Quotation", tone: "bg-accent/20 text-accent-foreground" },
  { key: "negotiation", ar: "تفاوض", en: "Negotiation", tone: "bg-warning/10 text-warning" },
  { key: "won", ar: "تم الفوز", en: "Won", tone: "bg-success/10 text-success" },
  { key: "lost", ar: "خسارة", en: "Lost", tone: "bg-destructive/10 text-destructive" },
] as const;

export type StageKey = (typeof PIPELINE_STAGES)[number]["key"];

export const LEAD_SOURCES = [
  { key: "website", ar: "الموقع الإلكتروني", en: "Website" },
  { key: "referral", ar: "ترشيح عميل", en: "Referral" },
  { key: "exhibition", ar: "معرض", en: "Exhibition" },
  { key: "campaign", ar: "حملة تسويقية", en: "Campaign" },
  { key: "walkin", ar: "زيارة مباشرة", en: "Walk-in" },
] as const;

export interface Lead {
  id: string;
  company: string;
  companyAr: string;
  contact: string;
  contactAr: string;
  phone: string;
  email: string;
  city: string;
  cityAr: string;
  source: string;
  owner: string;
  stage: StageKey;
  value: number;
  score: number;
  updated: string;
}

export const LEADS: Lead[] = [
  { id: "L-1041", company: "Riyadh Season Hotels", companyAr: "فنادق موسم الرياض", contact: "Abdulaziz Al-Sudairy", contactAr: "عبدالعزيز السديري", phone: "+966 55 120 4477", email: "aa@rsh.sa", city: "Riyadh", cityAr: "الرياض", source: "exhibition", owner: "Sara Al-Otaibi", stage: "negotiation", value: 1450000, score: 88, updated: "2h" },
  { id: "L-1040", company: "Jeddah Medical Tower", companyAr: "برج جدة الطبي", contact: "Hanan Bakr", contactAr: "حنان بكر", phone: "+966 56 900 1120", email: "hanan@jmt.sa", city: "Jeddah", cityAr: "جدة", source: "website", owner: "Reem Al-Sharif", stage: "quote", value: 620000, score: 74, updated: "5h" },
  { id: "L-1039", company: "NEOM Staff Housing", companyAr: "إسكان موظفي نيوم", contact: "Mishal Al-Rashid", contactAr: "مشعل الرشيد", phone: "+966 50 774 8890", email: "mishal@neomhousing.sa", city: "Tabuk", cityAr: "تبوك", source: "referral", owner: "Sara Al-Otaibi", stage: "qualified", value: 3900000, score: 92, updated: "1d" },
  { id: "L-1038", company: "Dammam Business Park", companyAr: "منتزه الدمام للأعمال", contact: "Faris Al-Sultan", contactAr: "فارس السلطان", phone: "+966 53 441 2200", email: "faris@dbpark.sa", city: "Dammam", cityAr: "الدمام", source: "campaign", owner: "Reem Al-Sharif", stage: "new", value: 275000, score: 41, updated: "1d" },
  { id: "L-1037", company: "Al-Faisaliah Schools", companyAr: "مدارس الفيصلية", contact: "Norah Al-Amri", contactAr: "نورة العمري", phone: "+966 54 662 3311", email: "norah@fschools.sa", city: "Riyadh", cityAr: "الرياض", source: "walkin", owner: "Sara Al-Otaibi", stage: "won", value: 810000, score: 100, updated: "3d" },
  { id: "L-1036", company: "Khobar Marina Cafés", companyAr: "مقاهي مارينا الخبر", contact: "Ziyad Al-Nasser", contactAr: "زياد الناصر", phone: "+966 59 331 7788", email: "ziyad@marinacafes.sa", city: "Khobar", cityAr: "الخبر", source: "website", owner: "Reem Al-Sharif", stage: "lost", value: 190000, score: 22, updated: "6d" },
  { id: "L-1035", company: "Qiddiya Hospitality", companyAr: "ضيافة القدية", contact: "Bandar Al-Muhaisen", contactAr: "بندر المحيسن", phone: "+966 55 018 9042", email: "bandar@qiddiyah.sa", city: "Riyadh", cityAr: "الرياض", source: "referral", owner: "Sara Al-Otaibi", stage: "quote", value: 2350000, score: 81, updated: "8h" },
];

export interface Customer {
  id: string;
  name: string;
  nameAr: string;
  segment: "enterprise" | "government" | "retail" | "contractor";
  city: string;
  cityAr: string;
  vat: string;
  owner: string;
  orders: number;
  revenue: number;
  balance: number;
  status: "active" | "hold" | "prospect";
}

export const CUSTOMERS: Customer[] = [
  { id: "C-2001", name: "Al-Faisaliah Schools", nameAr: "مدارس الفيصلية", segment: "enterprise", city: "Riyadh", cityAr: "الرياض", vat: "3001XXXXXXXXX11", owner: "Sara Al-Otaibi", orders: 24, revenue: 4120000, balance: 132000, status: "active" },
  { id: "C-2002", name: "Ministry of Education", nameAr: "وزارة التعليم", segment: "government", city: "Riyadh", cityAr: "الرياض", vat: "3001XXXXXXXXX12", owner: "Nawaf Al-Harbi", orders: 11, revenue: 9860000, balance: 0, status: "active" },
  { id: "C-2003", name: "Rawabi Contracting", nameAr: "الروابي للمقاولات", segment: "contractor", city: "Dammam", cityAr: "الدمام", vat: "3001XXXXXXXXX13", owner: "Reem Al-Sharif", orders: 38, revenue: 2740000, balance: 418000, status: "hold" },
  { id: "C-2004", name: "Nesma Hotels Group", nameAr: "مجموعة نسما للفنادق", segment: "enterprise", city: "Jeddah", cityAr: "جدة", vat: "3001XXXXXXXXX14", owner: "Sara Al-Otaibi", orders: 17, revenue: 6310000, balance: 220000, status: "active" },
  { id: "C-2005", name: "Modern Home Retail", nameAr: "المنزل الحديث للتجزئة", segment: "retail", city: "Khobar", cityAr: "الخبر", vat: "3001XXXXXXXXX15", owner: "Reem Al-Sharif", orders: 63, revenue: 1480000, balance: 51000, status: "active" },
  { id: "C-2006", name: "Qiddiya Hospitality", nameAr: "ضيافة القدية", segment: "enterprise", city: "Riyadh", cityAr: "الرياض", vat: "3001XXXXXXXXX16", owner: "Sara Al-Otaibi", orders: 2, revenue: 0, balance: 0, status: "prospect" },
];

export const SEGMENTS = [
  { key: "enterprise", ar: "شركات", en: "Enterprise" },
  { key: "government", ar: "جهات حكومية", en: "Government" },
  { key: "contractor", ar: "مقاولون", en: "Contractor" },
  { key: "retail", ar: "تجزئة", en: "Retail" },
] as const;

export interface Activity {
  id: string;
  type: "call" | "meeting" | "email" | "visit" | "task";
  ar: string;
  en: string;
  related: string;
  owner: string;
  due: string;
  done: boolean;
}

export const ACTIVITIES: Activity[] = [
  { id: "A-501", type: "call", ar: "مكالمة متابعة بخصوص عرض السعر", en: "Follow-up call about the quotation", related: "L-1040", owner: "Reem Al-Sharif", due: "اليوم 14:00", done: false },
  { id: "A-502", type: "meeting", ar: "اجتماع تصميم في موقع العميل", en: "On-site design meeting", related: "L-1039", owner: "Sara Al-Otaibi", due: "غداً 10:30", done: false },
  { id: "A-503", type: "email", ar: "إرسال كتالوج الأثاث المكتبي", en: "Send office furniture catalogue", related: "C-2005", owner: "Reem Al-Sharif", due: "اليوم 09:00", done: true },
  { id: "A-504", type: "visit", ar: "زيارة معرض الرياض", en: "Riyadh showroom visit", related: "L-1041", owner: "Sara Al-Otaibi", due: "الأحد 12:00", done: false },
  { id: "A-505", type: "task", ar: "تحديث بيانات الرقم الضريبي", en: "Update VAT registration details", related: "C-2003", owner: "Khalid Al-Dossari", due: "الاثنين", done: true },
];

export const CRM_KPIS = [
  { ar: "الفرص المفتوحة", en: "Open opportunities", value: "18", delta: "+3" },
  { ar: "قيمة المسار البيعي", en: "Pipeline value", value: "9.6M", delta: "+12%" },
  { ar: "معدل التحويل", en: "Conversion rate", value: "31%", delta: "+4%" },
  { ar: "متوسط دورة البيع", en: "Avg. sales cycle", value: "24d", delta: "-2d" },
];

export function sar(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

