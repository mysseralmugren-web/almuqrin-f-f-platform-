export const STAGE_CATALOG = [
  { code: "cutting", name_ar: "قص", name_en: "Cutting" },
  { code: "assembly", name_ar: "تجميع", name_en: "Assembly" },
  { code: "carpentry", name_ar: "نجارة", name_en: "Carpentry" },
  { code: "painting", name_ar: "دهان / تلبيس", name_en: "Painting / Veneer" },
  { code: "upholstery", name_ar: "تنجيد", name_en: "Upholstery" },
  { code: "finishing", name_ar: "تشطيب", name_en: "Finishing" },
  { code: "quality", name_ar: "جودة", name_en: "Quality" },
  { code: "packaging", name_ar: "تغليف", name_en: "Packaging" },
] as const;

export const MFG_STATUSES = [
  "draft",
  "approved",
  "awaiting_materials",
  "ready_to_produce",
  "in_production",
  "quality_check",
  "ready_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type MfgStatus = (typeof MFG_STATUSES)[number];

export const MFG_STATUS_AR: Record<MfgStatus, string> = {
  draft: "مسودة",
  approved: "معتمد",
  awaiting_materials: "بانتظار المواد",
  ready_to_produce: "جاهز للإنتاج",
  in_production: "قيد التصنيع",
  quality_check: "فحص جودة",
  ready_for_delivery: "جاهز للتسليم",
  delivered: "مسلّم",
  cancelled: "ملغي",
};

export const MFG_STATUS_EN: Record<MfgStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  awaiting_materials: "Awaiting materials",
  ready_to_produce: "Ready to produce",
  in_production: "In production",
  quality_check: "Quality check",
  ready_for_delivery: "Ready for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const MOVEMENT_TYPES = [
  "receipt",
  "issue_to_mfg",
  "return_from_mfg",
  "transfer",
  "adjustment",
  "reserve",
  "release_reserve",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_AR: Record<MovementType, string> = {
  receipt: "استلام",
  issue_to_mfg: "صرف لأمر تصنيع",
  return_from_mfg: "مرتجع من التصنيع",
  transfer: "تحويل",
  adjustment: "تسوية",
  reserve: "حجز",
  release_reserve: "فك حجز",
};

export const STAGE_STATUS_AR: Record<string, string> = {
  pending: "بانتظار",
  in_progress: "قيد التنفيذ",
  passed: "مكتمل",
  failed: "متعثر",
};

export const QC_RESULT_AR: Record<string, string> = {
  pass: "ناجح",
  fail: "مرفوض",
  rework: "إعادة عمل",
};

export const DEFAULT_QC_CHECKLIST = [
  "مطابقة الأبعاد للمواصفة",
  "جودة سطح الدهان / التلبيس",
  "إحكام الوصلات والمفصلات",
  "سلامة التنجيد والأقمشة",
  "نظافة القطعة وخلوها من الخدوش",
  "اكتمال الإكسسوارات والملحقات",
] as const;

