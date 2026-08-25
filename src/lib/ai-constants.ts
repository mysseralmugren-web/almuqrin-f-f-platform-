export const AI_JOB_KIND = {
  supplier_invoice: { ar: "فاتورة مورد", en: "Supplier invoice" },
  expense: { ar: "مصروف", en: "Expense" },
  quotation: { ar: "عرض سعر", en: "Quotation" },
  sales_order: { ar: "أمر بيع", en: "Sales order" },
  employee_contract: { ar: "عقد موظف", en: "Employee contract" },
  furniture_design: { ar: "تصميم/صورة أثاث", en: "Furniture design" },
  drawing_measurements: { ar: "مخطط ومقاسات", en: "Drawing & measurements" },
  general_document: { ar: "مستند عام", en: "General document" },
  seating_capacity: { ar: "سعة الجلسات", en: "Seating capacity" },
  design_skill: { ar: "تصميم ديزاين", en: "Design skill" },
} as const;
export type AiJobKind = keyof typeof AI_JOB_KIND;

export const AI_JOB_STATUS = {
  queued: { ar: "في الانتظار", en: "Queued" },
  running: { ar: "قيد المعالجة", en: "Running" },
  completed: { ar: "مكتملة", en: "Completed" },
  failed: { ar: "فاشلة", en: "Failed" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
} as const;

export const AI_VALUE_KIND = {
  fact: { ar: "حقيقة مستخرجة", en: "Extracted fact" },
  assumption: { ar: "افتراض", en: "Assumption" },
  estimate: { ar: "تقدير", en: "Estimate" },
} as const;

export const AI_REC_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  approved: { ar: "معتمدة", en: "Approved" },
  rejected: { ar: "مرفوضة", en: "Rejected" },
  applied: { ar: "مطبقة", en: "Applied" },
} as const;

export const AI_KIND_ROLES: Record<AiJobKind, string[]> = {
  supplier_invoice: ["accountant"],
  expense: ["accountant"],
  quotation: ["sales_manager", "sales_employee"],
  sales_order: ["sales_manager", "sales_employee"],
  employee_contract: ["hr"],
  furniture_design: ["production_manager", "designer", "project_manager", "quality_manager", "technician"],
  drawing_measurements: ["production_manager", "designer", "project_manager", "quality_manager", "technician"],
  seating_capacity: ["production_manager", "designer", "project_manager", "quality_manager", "technician"],
  design_skill: ["production_manager", "designer", "project_manager", "quality_manager", "technician"],
  general_document: [],
};

/** Kinds that accept file uploads. */
export const AI_FILE_KINDS: AiJobKind[] = [
  "supplier_invoice", "expense", "quotation", "sales_order",
  "employee_contract", "furniture_design", "drawing_measurements", "general_document",
];

export const AI_ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export const AI_ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg", "webp"] as const;

export const AI_TEXT_MODELS = ["google/gemini-3.6-flash", "google/gemini-3.1-flash-lite", "google/gemini-2.5-pro"] as const;
export const AI_IMAGE_MODEL = "google/gemini-3.1-flash-image";
export const AI_DEFAULT_MODEL = "google/gemini-3.6-flash";

export const SEAT_PITCHES = [55, 60, 65] as const;
export type SeatPitch = (typeof SEAT_PITCHES)[number];

/** Pure, transparent seating capacity math (no AI involved). */
export function seatingCapacity(input: {
  segments: Array<{ label?: string; length_cm: number }>;
  pitch_cm: SeatPitch;
  corner_loss_cm?: number;
  armrest_loss_cm?: number;
}) {
  const cornerLoss = input.corner_loss_cm ?? 0;
  const armLoss = input.armrest_loss_cm ?? 0;
  const rows = input.segments.map((s) => {
    const usable = Math.max(0, s.length_cm - cornerLoss - armLoss);
    const seats = Math.floor(usable / input.pitch_cm);
    return { label: s.label ?? "", length_cm: s.length_cm, usable_cm: usable, seats };
  });
  const total = rows.reduce((a, r) => a + r.seats, 0);
  return {
    rows,
    total_seats: total,
    formula: `seats = floor((length_cm - corner_loss - armrest_loss) / ${input.pitch_cm})`,
    assumptions: [
      `مسافة الجلوس للشخص = ${input.pitch_cm} سم`,
      `خصم الزوايا = ${cornerLoss} سم لكل قطعة`,
      `خصم المساند الجانبية = ${armLoss} سم لكل قطعة`,
      "الأرقام تقديرية وتعتمد على المقاسات المدخلة يدويًا وليست مستخرجة من صورة",
    ],
  };
}

const ERRORS: Record<string, { ar: string; en: string }> = {
  NO_COMPANY: { ar: "لا توجد منشأة مرتبطة بالمستخدم", en: "User has no company" },
  FORBIDDEN_ROLE: { ar: "لا تملك صلاحية لهذا الإجراء", en: "You are not allowed to do this" },
  FORBIDDEN_KIND: { ar: "لا تملك صلاحية لهذا النوع من التحليل", en: "You are not allowed to run this analysis kind" },
  AI_DISABLED: { ar: "الموظف الذكي معطّل لهذه المنشأة", en: "AI employee is disabled for this company" },
  AI_MIME_NOT_ALLOWED: { ar: "نوع الملف غير مسموح", en: "File type is not allowed" },
  AI_FILE_TOO_LARGE: { ar: "حجم الملف يتجاوز الحد المسموح", en: "File exceeds the allowed size" },
  AI_PATH_OUTSIDE_COMPANY: { ar: "مسار الملف خارج نطاق المنشأة", en: "File path is outside the company scope" },
  AI_JOB_NOT_FOUND: { ar: "المهمة غير موجودة", en: "Job not found" },
  AI_NO_FILES: { ar: "أضف ملفًا واحدًا على الأقل قبل التحليل", en: "Attach at least one file before analysis" },
  AI_JOB_BUSY: { ar: "المهمة قيد المعالجة", en: "Job is already running" },
  AI_MAX_ATTEMPTS: { ar: "تم استنفاد عدد المحاولات المسموح", en: "Maximum retry attempts reached" },
  AI_REC_NOT_APPROVED: { ar: "يجب اعتماد التوصية قبل التطبيق", en: "Recommendation must be approved before it is applied" },
  AI_REC_ALREADY_APPLIED: { ar: "تم تطبيق التوصية مسبقًا", en: "Recommendation was already applied" },
  AI_PROVIDER_FAILED: { ar: "تعذّر الوصول لمزوّد الذكاء الاصطناعي", en: "AI provider request failed" },
  AI_PROVIDER_RATE_LIMIT: { ar: "تم تجاوز حد الطلبات، حاول لاحقًا", en: "Rate limit exceeded, try again later" },
  AI_PROVIDER_NO_CREDITS: { ar: "رصيد الذكاء الاصطناعي غير كافٍ", en: "AI credits exhausted" },
  AI_BAD_OUTPUT: { ar: "تعذّر قراءة مخرجات التحليل", en: "Could not parse the analysis output" },
  AI_NOT_COMPLETED: { ar: "لم تكتمل المهمة بعد", en: "Job is not completed yet" },
  AI_ALREADY_LINKED: { ar: "تم الربط بسجل مسبقًا", en: "Already linked to a record" },
};

export function aiErrorText(code: string, ar: boolean) {
  const key = Object.keys(ERRORS).find((k) => code.includes(k));
  if (key) return ar ? ERRORS[key]!.ar : ERRORS[key]!.en;
  return ar ? "حدث خطأ غير متوقع" : "Unexpected error";
}

export function labelOf(map: Record<string, { ar: string; en: string }>, key: string | null | undefined, ar: boolean) {
  if (!key) return "—";
  const e = map[key];
  return e ? (ar ? e.ar : e.en) : key;
}

