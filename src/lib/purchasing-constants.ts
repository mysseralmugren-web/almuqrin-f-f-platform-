export const PR_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  submitted: { ar: "مقدم", en: "Submitted" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  converted: { ar: "محوّل", en: "Converted" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const RFQ_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  sent: { ar: "مرسل", en: "Sent" },
  closed: { ar: "مغلق", en: "Closed" },
  awarded: { ar: "مُرسى", en: "Awarded" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const PO_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  approved: { ar: "معتمد", en: "Approved" },
  partially_received: { ar: "مستلم جزئيًا", en: "Partially received" },
  received: { ar: "مستلم", en: "Received" },
  closed: { ar: "مغلق", en: "Closed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const GRN_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  posted: { ar: "مرحّل", en: "Posted" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const SINV_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  matched: { ar: "مطابقة", en: "Matched" },
  discrepancy: { ar: "اختلاف", en: "Discrepancy" },
  approved: { ar: "معتمدة", en: "Approved" },
  paid: { ar: "مدفوعة", en: "Paid" },
  void: { ar: "ملغاة", en: "Void" },
} as const;

export const PAY_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  submitted: { ar: "مقدم", en: "Submitted" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  executed: { ar: "منفّذ", en: "Executed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const MATCH_STATUS = {
  pending: { ar: "بانتظار المطابقة", en: "Pending" },
  matched: { ar: "مطابقة ثلاثية ناجحة", en: "Three-way matched" },
  qty_variance: { ar: "اختلاف كميات", en: "Quantity variance" },
  price_variance: { ar: "اختلاف أسعار", en: "Price variance" },
  no_receipt: { ar: "لا يوجد استلام مرحّل", en: "No posted receipt" },
} as const;

export const TAX_TREATMENT = {
  standard: { ar: "ضريبة مدخلات 15%", en: "Standard 15%" },
  exempt: { ar: "معفى", en: "Exempt" },
  out_of_scope: { ar: "خارج النطاق", en: "Out of scope" },
} as const;

export const SUPPLIER_STATUS = {
  active: { ar: "نشط", en: "Active" },
  on_hold: { ar: "موقوف مؤقتًا", en: "On hold" },
  blocked: { ar: "محظور", en: "Blocked" },
} as const;

export const UNITS = ["قطعة", "متر", "متر مربع", "متر مكعب", "كجم", "لتر", "لوح", "علبة", "ساعة"] as const;

export const PURCHASE_ERRORS: Record<string, { ar: string; en: string }> = {
  FORBIDDEN_ROLE: { ar: "لا تملك صلاحية تنفيذ هذا الإجراء", en: "You are not allowed to perform this action" },
  FORBIDDEN_APPROVAL: {
    ar: "عكس القيود وإقفال الفترات مقصور على الإدارة",
    en: "Reversal and period closing are restricted to management",
  },
  NO_COMPANY: { ar: "لم يتم ربط حسابك بمنشأة", en: "Your account has no company" },
  SUPPLIER_VAT_DUPLICATE: { ar: "الرقم الضريبي مسجل لمورد آخر", en: "VAT number already exists" },
  SUPPLIER_CR_DUPLICATE: { ar: "السجل التجاري مسجل لمورد آخر", en: "CR number already exists" },
  SUPPLIER_CODE_DUPLICATE: { ar: "كود المورد مستخدم", en: "Supplier code already used" },
  OVER_RECEIPT_NOT_APPROVED: { ar: "الكمية تتجاوز المطلوب ويلزم اعتماد مدير", en: "Over-receipt requires manager approval" },
  PO_LOCKED_NOT_DRAFT: { ar: "لا يمكن تعديل بنود أمر شراء غير مسودة", en: "Only draft purchase orders can be edited" },
  PO_HAS_NO_ITEMS: { ar: "لا يمكن اعتماد أمر شراء بدون بنود", en: "Cannot approve an empty purchase order" },
  PO_NOT_RECEIVABLE: { ar: "أمر الشراء غير قابل للاستلام في حالته الحالية", en: "Purchase order is not receivable" },
  PAYMENT_EXCEEDS_INVOICE_TOTAL: { ar: "مبلغ الدفع يتجاوز قيمة الفاتورة", en: "Payment exceeds invoice total" },
  INVOICE_NOT_APPROVED_FOR_PAYMENT: { ar: "الفاتورة غير معتمدة للدفع", en: "Invoice is not approved for payment" },
  EXECUTED_PAYMENT_IMMUTABLE: { ar: "لا يمكن تعديل دفعة منفّذة", en: "Executed payment cannot be changed" },
  DUPLICATE_SUPPLIER_INVOICE: { ar: "رقم فاتورة المورد مكرر لهذا المورد", en: "Duplicate supplier invoice number" },
  PAYMENT_EXECUTION_REQUIREMENTS: {
    ar: "التنفيذ يتطلب اعتمادًا ومرجعًا بنكيًا وتأكيد القيد المحاسبي",
    en: "Execution requires approval, bank reference and posted accounting entry",
  },
  GRN_LOCKED: { ar: "لا يمكن تعديل محضر استلام مرحّل", en: "Posted receipt cannot be modified" },
  PAYMENT_EXCEEDS_ORDER_TOTAL: { ar: "مبلغ الدفعة يتجاوز إجمالي أمر البيع", en: "Payment exceeds sales order total" },
  ORDER_NOT_CONFIRMED: { ar: "لا يمكن تسجيل دفعة على أمر بيع مسودة", en: "Cannot record a payment on a draft order" },
  ORDER_CANCELLED: { ar: "أمر البيع ملغى", en: "Sales order is cancelled" },
  PAYMENT_AMOUNT_MUST_BE_POSITIVE: { ar: "مبلغ الدفعة يجب أن يكون أكبر من صفر", en: "Payment amount must be positive" },
};

export function purchaseErrorText(msg: string, ar: boolean) {
  const key = Object.keys(PURCHASE_ERRORS).find((k) => msg.includes(k));
  if (!key) return msg;
  return ar ? PURCHASE_ERRORS[key]!.ar : PURCHASE_ERRORS[key]!.en;
}

export const RETURN_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  posted: { ar: "مرحّل", en: "Posted" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

