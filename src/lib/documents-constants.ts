/** Module 10 — Documents, Identity, Templates & Printing: shared, UI-safe constants. */

export const DOC_KINDS = [
  "quotation",
  "sales_order",
  "tax_invoice",
  "receipt_voucher",
  "payment_voucher",
  "manufacturing_order",
  "goods_receipt",
  "delivery_note",
  "measurement_report",
  "design_approval",
  "final_handover",
  "supply_contract",
  "employee_contract",
] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_LABEL: Record<DocKind, { ar: string; en: string }> = {
  quotation: { ar: "عرض سعر", en: "Quotation" },
  sales_order: { ar: "أمر بيع", en: "Sales order" },
  tax_invoice: { ar: "فاتورة ضريبية", en: "Tax invoice" },
  receipt_voucher: { ar: "سند قبض", en: "Receipt voucher" },
  payment_voucher: { ar: "سند صرف", en: "Payment voucher" },
  manufacturing_order: { ar: "أمر تصنيع", en: "Manufacturing order" },
  goods_receipt: { ar: "محضر استلام بضاعة", en: "Goods receipt" },
  delivery_note: { ar: "تسليم بضاعة للعميل", en: "Delivery note" },
  measurement_report: { ar: "محضر قياس", en: "Measurement report" },
  design_approval: { ar: "اعتماد تصميم/خامة/لون", en: "Design / material approval" },
  final_handover: { ar: "محضر استلام نهائي", en: "Final handover" },
  supply_contract: { ar: "عقد تصنيع وتوريد", en: "Manufacturing & supply contract" },
  employee_contract: { ar: "عقد موظف", en: "Employee contract" },
};

/** Default sequence prefix per document kind. */
export const DOC_KIND_PREFIX: Record<DocKind, string> = {
  quotation: "QT",
  sales_order: "SO",
  tax_invoice: "INV",
  receipt_voucher: "RV",
  payment_voucher: "PV",
  manufacturing_order: "MO",
  goods_receipt: "GRN",
  delivery_note: "DN",
  measurement_report: "MR",
  design_approval: "DA",
  final_handover: "HO",
  supply_contract: "CT",
  employee_contract: "EC",
};

export const DOC_STATUSES = ["draft", "review", "approved", "issued", "void"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const DOC_STATUS_LABEL: Record<DocStatus, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  review: { ar: "قيد المراجعة", en: "In review" },
  approved: { ar: "معتمد", en: "Approved" },
  issued: { ar: "صادر", en: "Issued" },
  void: { ar: "ملغى", en: "Void" },
};

export const COMPANY_DOC_TYPES = [
  { key: "cr", ar: "السجل التجاري", en: "Commercial registration" },
  { key: "vat_certificate", ar: "شهادة الضريبة", en: "VAT certificate" },
  { key: "address_proof", ar: "إثبات العنوان الوطني", en: "National address proof" },
  { key: "chamber", ar: "الغرفة التجارية", en: "Chamber membership" },
  { key: "license", ar: "رخصة/تصريح", en: "License" },
  { key: "bank_letter", ar: "خطاب بنكي", en: "Bank letter" },
  { key: "other", ar: "أخرى", en: "Other" },
] as const;

export const COMPANY_DOC_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  draft: { ar: "مسودة", en: "Draft" },
  review: { ar: "قيد المراجعة", en: "In review" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  expired: { ar: "منتهي", en: "Expired" },
};

export const DOC_FILE_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const DOC_FILE_MAX_MB = 25;

/** Brand tokens fixed by the factory identity (navy + silver only). */
export const BRAND = { primary: "#1E3A5F", secondary: "#C0C0C0" } as const;

/** Insertable factory terms (Arabic). Editable per template version. */
export const FACTORY_TERMS_AR = [
  "الدفعات: 50% عند توقيع أمر البيع/العقد، 30% عند إنجاز 50% من التصنيع، 20% قبل أو عند التسليم النهائي.",
  "يبدأ التصنيع بعد سداد الدفعة الأولى واكتمال الاعتمادات المطلوبة.",
  "تُحتسب مدة التنفيذ بعد اعتماد الرسومات والألوان والخامات من العميل.",
  "أي تغيير بعد الاعتماد يُعد عملاً إضافيًا يُسعّر ويُحتسب على مدة تنفيذ إضافية.",
  "يتم فحص الأصناف عند الاستلام وإثبات أي ملاحظات في محضر الاستلام.",
  "في حال الإلغاء بعد بدء التصنيع يُطبّق النظام المعمول به ويستحق المصنع قيمة ما تم إنجازه وما تم شراؤه من خامات.",
  "الضمان يغطي عيوب التصنيع فقط ولا يشمل سوء الاستخدام أو التعديل خارج المصنع أو عوامل الرطوبة والحرارة غير الطبيعية.",
  "يكون التنفيذ وفق العينات والرسومات والمواصفات المعتمدة خطيًا، وليس وفق صور الشاشات أو الصور التسويقية.",
  "الاختصاص القضائي للجهات المختصة داخل المملكة العربية السعودية.",
].join("\n");

/**
 * Identity values proposed for human approval (item 9). They are NEVER applied
 * automatically and never issue a document by themselves. No IBAN / bank data.
 */
export const IDENTITY_PROPOSALS: Array<{ field_key: string; ar: string; value: string }> = [
  { field_key: "legal_name_ar", ar: "الاسم القانوني", value: "مصنع ميسر عبدالرحمن المقرن للأثاث" },
  { field_key: "trade_name_ar", ar: "الاسم التجاري", value: "مصنع المقرن للأثاث والديكور" },
  { field_key: "cr_number", ar: "السجل التجاري", value: "7052998890" },
  { field_key: "vat_number", ar: "الرقم الضريبي", value: "314488703200003" },
  { field_key: "vat_effective_date", ar: "تاريخ نفاذ الضريبة", value: "2026-01-01" },
  { field_key: "address_city", ar: "المدينة", value: "الرياض" },
  { field_key: "address_district", ar: "الحي", value: "حي النور" },
  { field_key: "address_street", ar: "الشارع", value: "طريب" },
  { field_key: "address_postal_code", ar: "الرمز البريدي", value: "14321" },
  { field_key: "address_building_no", ar: "رقم المبنى", value: "3451" },
  { field_key: "address_additional_no", ar: "الرقم الإضافي", value: "6758" },
  { field_key: "short_address", ar: "العنوان المختصر", value: "RNNA3451" },
  { field_key: "website", ar: "الموقع الإلكتروني", value: "www.almuqrinfurniturefactory.com" },
];

/** Address-proof notice (item 10) — informational only, not an official document. */
export const ADDRESS_PROOF_NOTICE = {
  expiredOn: "2026-07-11",
  ar: "إثبات العنوان الوطني المتحقق منه كان منتهيًا بتاريخ 2026-07-11 — يلزم رفع إثبات ساري ومراجعته قبل اعتماده. هذه المعلومة تنبيه داخلي وليست مستندًا رسميًا داخل النظام.",
  en: "The verified national address proof expired on 2026-07-11 — upload a valid proof and review it before approval. This notice is not an official document inside the system.",
};

export const VAT_RATE = 0.15;
/** Unified rounding: half-up on 2 decimals. */
export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function splitTax(amount: number, inclusive: boolean, rate = VAT_RATE) {
  const a = Number(amount) || 0;
  const net = inclusive ? round2(a / (1 + rate)) : round2(a);
  const vat = inclusive ? round2(a - net) : round2(a * rate);
  return { net, vat, gross: round2(net + vat) };
}

const ERRORS: Record<string, { ar: string; en: string }> = {
  NO_COMPANY: { ar: "لا توجد منشأة مرتبطة بحسابك.", en: "No company linked to your account." },
  FORBIDDEN: { ar: "لا تملك صلاحية تنفيذ هذا الإجراء.", en: "You are not allowed to perform this action." },
  FORBIDDEN_KIND: { ar: "لا تملك صلاحية على هذا النوع من الوثائق.", en: "You cannot handle this document kind." },
  DOC_NOT_FOUND: { ar: "الوثيقة غير موجودة.", en: "Document not found." },
  SOURCE_NOT_FOUND: { ar: "السجل المصدر غير موجود.", en: "Source record not found." },
  DOC_MUST_START_DRAFT: { ar: "تبدأ الوثيقة كمسودة دائمًا.", en: "Documents always start as draft." },
  DOC_NOT_APPROVED: { ar: "لا يمكن الإصدار قبل الاعتماد.", en: "Cannot issue before approval." },
  DOC_INVALID_TRANSITION: { ar: "انتقال حالة غير مسموح.", en: "Invalid status transition." },
  DOC_IMMUTABLE_AFTER_ISSUE: {
    ar: "لا يمكن تعديل الوثيقة بعد الإصدار — أصدر نسخة مصححة جديدة.",
    en: "Issued documents are immutable — issue a corrected revision instead.",
  },
  DOC_VOID_REASON_REQUIRED: { ar: "سبب الإلغاء مطلوب.", en: "A void reason is required." },
  DOC_ALREADY_ISSUED: { ar: "الوثيقة صادرة بالفعل.", en: "Document is already issued." },
  TEMPLATE_VERSION_LOCKED: { ar: "لا يمكن تعديل إصدار قالب منشور.", en: "Published template versions are locked." },
  COMPANY_DATA_INCOMPLETE: {
    ar: "لا يمكن إصدار فاتورة ضريبية قبل اكتمال بيانات المنشأة (الرقم الضريبي والعنوان الوطني) واعتمادها.",
    en: "Tax invoices require complete, approved company data (VAT number + national address).",
  },
  FILE_TYPE_NOT_ALLOWED: { ar: "نوع الملف غير مسموح.", en: "File type is not allowed." },
  FILE_TOO_LARGE: { ar: "حجم الملف يتجاوز الحد المسموح.", en: "File exceeds the allowed size." },
  PATH_OUTSIDE_COMPANY: { ar: "مسار الملف خارج نطاق المنشأة.", en: "File path is outside the company scope." },
  PROPOSAL_NOT_PENDING: { ar: "المقترح تمت معالجته مسبقًا.", en: "Proposal already processed." },
};

export function documentsErrorText(message: string, ar: boolean) {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  if (!key) return message;
  return ar ? ERRORS[key]!.ar : ERRORS[key]!.en;
}
