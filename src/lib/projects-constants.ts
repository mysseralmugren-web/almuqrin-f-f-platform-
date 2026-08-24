export const PROJECT_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  planning: { ar: "تخطيط", en: "Planning" },
  survey: { ar: "معاينة الموقع", en: "Site survey" },
  design: { ar: "تصميم واعتمادات", en: "Design & approvals" },
  approved: { ar: "معتمد", en: "Approved" },
  in_production: { ar: "قيد التصنيع", en: "In production" },
  installation: { ar: "التركيب", en: "Installation" },
  handover: { ar: "الاستلام", en: "Handover" },
  completed: { ar: "مكتمل", en: "Completed" },
  on_hold: { ar: "متوقف", en: "On hold" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const PROJECT_PRIORITY = {
  low: { ar: "منخفضة", en: "Low" },
  normal: { ar: "عادية", en: "Normal" },
  high: { ar: "مرتفعة", en: "High" },
  critical: { ar: "حرجة", en: "Critical" },
} as const;

export const SURVEY_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  submitted: { ar: "مقدمة للعميل", en: "Submitted" },
  customer_approved: { ar: "معتمدة من العميل", en: "Customer approved" },
  superseded: { ar: "مستبدلة بمراجعة", en: "Superseded" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
} as const;

export const APPROVAL_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  submitted: { ar: "بانتظار الاعتماد", en: "Pending approval" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  superseded: { ar: "مستبدل", en: "Superseded" },
} as const;

export const TASK_STATUS = {
  todo: { ar: "لم تبدأ", en: "To do" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  blocked: { ar: "معطلة", en: "Blocked" },
  done: { ar: "منجزة", en: "Done" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
} as const;

export const INSTALL_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  scheduled: { ar: "مجدول", en: "Scheduled" },
  dispatched: { ar: "الفريق في الطريق", en: "Dispatched" },
  in_progress: { ar: "قيد التركيب", en: "In progress" },
  paused: { ar: "متوقف مؤقتًا", en: "Paused" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const HANDOVER_TYPE = {
  preliminary: { ar: "استلام ابتدائي", en: "Preliminary handover" },
  final: { ar: "استلام نهائي", en: "Final handover" },
} as const;

export const SNAG_STATUS = {
  open: { ar: "مفتوحة", en: "Open" },
  in_progress: { ar: "قيد المعالجة", en: "In progress" },
  fixed: { ar: "تم الإصلاح", en: "Fixed" },
  verified: { ar: "تم التحقق", en: "Verified" },
  waived: { ar: "متنازل عنها", en: "Waived" },
} as const;

export const WARRANTY_STATUS = {
  active: { ar: "ساري", en: "Active" },
  expired: { ar: "منتهي", en: "Expired" },
  void: { ar: "ملغي", en: "Void" },
} as const;

export const CLAIM_STATUS = {
  new: { ar: "جديد", en: "New" },
  triaged: { ar: "تم التصنيف", en: "Triaged" },
  scheduled: { ar: "مجدول", en: "Scheduled" },
  in_progress: { ar: "قيد المعالجة", en: "In progress" },
  resolved: { ar: "تمت المعالجة", en: "Resolved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  closed: { ar: "مغلق", en: "Closed" },
} as const;

export const COMM_CHANNEL = {
  call: { ar: "مكالمة", en: "Call" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  email: { ar: "بريد إلكتروني", en: "Email" },
  meeting: { ar: "اجتماع", en: "Meeting" },
  site_visit: { ar: "زيارة موقع", en: "Site visit" },
  other: { ar: "أخرى", en: "Other" },
} as const;

const ERRORS: Record<string, { ar: string; en: string }> = {
  NO_COMPANY: { ar: "لم يتم ربط حسابك بمنشأة", en: "Your account is not linked to a company" },
  FORBIDDEN_PROJECT: { ar: "لا تملك صلاحية على هذا المشروع", en: "You are not allowed on this project" },
  FORBIDDEN_ROLE: { ar: "لا تملك صلاحية تنفيذ هذا الإجراء", en: "You are not allowed to perform this action" },
  PROJECT_NOT_FOUND: { ar: "المشروع غير موجود", en: "Project not found" },
  PROJECT_HAS_OPEN_CRITICAL_TASKS: { ar: "لا يمكن إغلاق المشروع مع وجود مهام حرجة مفتوحة (أو وثّق استثناءً معتمدًا)", en: "Cannot close the project while critical tasks are open (or document an approved exception)" },
  PROJECT_HAS_OPEN_CRITICAL_SNAGS: { ar: "لا يمكن إغلاق المشروع مع ملاحظات استلام حرجة مفتوحة (أو وثّق استثناءً معتمدًا)", en: "Cannot close the project while critical snags are open (or document an approved exception)" },
  SURVEY_APPROVED_IMMUTABLE: { ar: "المعاينة معتمدة من العميل ولا تُعدّل إلا بمراجعة جديدة", en: "Approved survey is immutable; create a new revision" },
  SURVEY_SUPERSEDED: { ar: "هذه المعاينة مستبدلة بمراجعة أحدث", en: "This survey has been superseded" },
  REVISION_LOCKED: { ar: "الإصدار معتمد/مرفوض ولا يمكن تعديله", en: "Decided revision cannot be edited" },
  APPROVAL_LOCKED: { ar: "الاعتماد صدر ولا يمكن تعديل مرفقه", en: "Decided approval cannot be edited" },
  REJECTION_REASON_REQUIRED: { ar: "سبب الرفض مطلوب", en: "Rejection reason is required" },
  TASK_DEPENDENCY_CYCLE: { ar: "لا يمكن إنشاء اعتمادية دائرية بين المهام", en: "Circular task dependency is not allowed" },
  MO_NOT_READY_FOR_DELIVERY: { ar: "أمر التصنيع غير جاهز للتسليم", en: "Manufacturing order is not ready for delivery" },
  QUALITY_NOT_APPROVED: { ar: "يوجد فحص جودة راسب لهذا الأمر", en: "A failed quality inspection exists for this order" },
  DELIVERY_EXCEEDS_ORDERED_QTY: { ar: "الكمية المسلّمة تتجاوز الكمية المطلوبة", en: "Delivered quantity exceeds the ordered quantity" },
  DELIVERY_QTY_MUST_BE_POSITIVE: { ar: "الكمية يجب أن تكون أكبر من صفر", en: "Quantity must be positive" },
  DELIVERY_NOTE_LOCKED: { ar: "إذن التسليم لم يعد قابلًا للتعديل", en: "Delivery note is locked" },
  DELIVERY_NOTE_EMPTY: { ar: "لا توجد بنود في إذن التسليم", en: "Delivery note has no items" },
  CRITICAL_SNAGS_OPEN: { ar: "لا يمكن اعتماد الاستلام النهائي مع ملاحظات حرجة مفتوحة", en: "Final handover blocked by open critical snags" },
  WAIVER_NOTE_REQUIRED: { ar: "التنازل عن الملاحظة يتطلب توثيق السبب", en: "Waiving a snag requires a documented reason" },
  WARRANTY_REQUIRES_FINAL_HANDOVER: { ar: "الضمان يبدأ من محضر استلام نهائي معتمد", en: "Warranty requires an approved final handover" },
  CLAIM_OUTSIDE_WARRANTY_PERIOD: { ar: "البلاغ خارج فترة الضمان", en: "Claim is outside the warranty period" },
  CLAIM_CLOSED_IMMUTABLE: { ar: "البلاغ مغلق ولا يمكن إعادة فتحه", en: "Closed claim cannot be reopened" },
  INSTALL_SCHEDULE_INCOMPLETE: { ar: "الجدولة تتطلب تاريخًا وفريق تركيب", en: "Scheduling requires a date and a team" },
  INSUFFICIENT_STOCK: { ar: "الرصيد غير كافٍ في المستودع", en: "Insufficient stock" },
  ACCOUNTS_NOT_CONFIGURED: { ar: "حسابات الترحيل غير مهيأة", en: "Posting accounts are not configured" },
};

export function projectErrorText(code: string, ar: boolean): string {
  const key = Object.keys(ERRORS).find((k) => code.includes(k));
  if (key) return ar ? ERRORS[key]!.ar : ERRORS[key]!.en;
  if (code.startsWith("INVALID_INSTALL_TRANSITION")) return ar ? "انتقال حالة تركيب غير مسموح" : "Invalid installation status transition";
  return code;
}

export function labelOf(map: Record<string, { ar: string; en: string }>, key: string | null | undefined, ar: boolean) {
  if (!key) return "—";
  const v = map[key];
  return v ? (ar ? v.ar : v.en) : key;
}

