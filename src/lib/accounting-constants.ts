export const JE_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  approved: { ar: "معتمد", en: "Approved" },
  posted: { ar: "مرحّل", en: "Posted" },
  reversed: { ar: "معكوس", en: "Reversed" },
} as const;

export const VOUCHER_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  confirmed: { ar: "مؤكد", en: "Confirmed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
} as const;

export const VOUCHER_TYPE = {
  receipt: { ar: "سند قبض", en: "Receipt" },
  payment: { ar: "سند صرف", en: "Payment" },
  transfer: { ar: "حوالة بين الحسابات", en: "Transfer" },
} as const;

export const PERIOD_STATUS = {
  open: { ar: "مفتوحة", en: "Open" },
  closed: { ar: "مغلقة", en: "Closed" },
} as const;

export const ACCOUNT_TYPE = {
  asset: { ar: "أصول", en: "Assets" },
  liability: { ar: "التزامات", en: "Liabilities" },
  equity: { ar: "حقوق الملكية", en: "Equity" },
  revenue: { ar: "إيرادات", en: "Revenue" },
  expense: { ar: "مصروفات", en: "Expenses" },
} as const;

export const SETTING_KEYS = [
  { key: "ar_account_id", ar: "ذمم العملاء", en: "Accounts receivable", type: "asset" },
  { key: "ap_account_id", ar: "ذمم الموردين", en: "Accounts payable", type: "liability" },
  { key: "output_vat_account_id", ar: "ضريبة المخرجات", en: "Output VAT", type: "liability" },
  { key: "input_vat_account_id", ar: "ضريبة المدخلات", en: "Input VAT", type: "asset" },
  { key: "sales_revenue_account_id", ar: "إيرادات المبيعات", en: "Sales revenue", type: "revenue" },
  { key: "inventory_account_id", ar: "المخزون", en: "Inventory", type: "asset" },
  { key: "cogs_account_id", ar: "تكلفة المبيعات", en: "Cost of sales", type: "expense" },
  { key: "wip_account_id", ar: "إنتاج تحت التشغيل", en: "Work in progress", type: "asset" },
  { key: "scrap_account_id", ar: "الهالك", en: "Scrap / waste", type: "expense" },
  { key: "cash_account_id", ar: "النقدية والبنوك", en: "Cash & banks", type: "asset" },
  { key: "purchase_expense_account_id", ar: "المشتريات والمصروفات", en: "Purchases / expenses", type: "expense" },
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number]["key"];

const ERRORS: Record<string, { ar: string; en: string }> = {
  ENTRY_NOT_BALANCED: { ar: "القيد غير متوازن: مجموع المدين يجب أن يساوي الدائن", en: "Entry is not balanced" },
  ENTRY_NEEDS_LINES: { ar: "القيد يحتاج بندين على الأقل", en: "Entry needs at least two lines" },
  ENTRY_AMOUNT_ZERO: { ar: "قيمة القيد يجب أن تكون أكبر من صفر", en: "Entry amount must be positive" },
  POSTED_ENTRY_IMMUTABLE: { ar: "لا يمكن تعديل أو حذف قيد مرحّل — استخدم العكس", en: "Posted entry is immutable — reverse it" },
  JOURNAL_ENTRY_LOCKED: { ar: "لا يمكن تعديل بنود قيد غير مسودة", en: "Only draft entries can be edited" },
  PERIOD_CLOSED: { ar: "الفترة المالية مغلقة", en: "Fiscal period is closed" },
  PERIOD_NOT_FOUND: { ar: "لا توجد فترة مالية تغطي هذا التاريخ", en: "No fiscal period covers this date" },
  PERIOD_OVERLAP: { ar: "الفترة المالية متداخلة مع فترة أخرى", en: "Fiscal period overlaps another period" },
  POSTING_DUPLICATE: { ar: "تم ترحيل هذا المستند مسبقًا", en: "Document already posted" },
  ACCOUNT_NOT_POSTABLE: { ar: "لا يمكن الترحيل على حساب رئيسي أو موقوف", en: "Account is a parent or inactive" },
  ACCOUNT_NOT_IN_COMPANY: { ar: "الحساب لا يتبع المنشأة", en: "Account belongs to another company" },
  ACCOUNT_CYCLE: { ar: "تسلسل حسابات دائري غير مسموح", en: "Circular account hierarchy" },
  PARENT_TYPE_MISMATCH: { ar: "نوع الحساب يجب أن يطابق الحساب الأب", en: "Account type must match parent" },
  MAPPING_INCOMPLETE: { ar: "أكمل ربط الحسابات في إعدادات المحاسبة أولًا", en: "Complete the account mapping first" },
  BANK_REFERENCE_REQUIRED: { ar: "المرجع البنكي إلزامي قبل التأكيد", en: "Bank reference required before confirming" },
  JOURNAL_ENTRY_REQUIRED: { ar: "لا يمكن تأكيد السند دون قيد محاسبي", en: "Voucher needs a journal entry" },
  JOURNAL_ENTRY_NOT_POSTED: { ar: "القيد المرتبط غير مرحّل", en: "Linked entry is not posted" },
  VOUCHER_CONFIRMED_IMMUTABLE: { ar: "لا يمكن تعديل أو حذف سند مؤكد", en: "Confirmed voucher is immutable" },
  TRANSFER_TARGET_REQUIRED: { ar: "حدد الحساب البنكي المستلم", en: "Select the destination bank account" },
  TRANSFER_SAME_ACCOUNT: { ar: "لا يمكن التحويل لنفس الحساب", en: "Cannot transfer to the same account" },
  EXEMPTION_REASON_REQUIRED: { ar: "سبب الإعفاء إلزامي للفواتير المعفاة أو خارج النطاق", en: "Exemption reason is required" },
  VAT_MUST_BE_ZERO_FOR_EXEMPT: { ar: "لا يجوز احتساب ضريبة على فاتورة معفاة", en: "Exempt invoice must have zero VAT" },
  SOURCE_NOT_POSTABLE: { ar: "المستند غير جاهز للترحيل", en: "Document is not ready for posting" },
  NOTHING_TO_POST: { ar: "لا توجد مستندات جاهزة للترحيل", en: "Nothing to post" },
  FORBIDDEN_ROLE: { ar: "ليس لديك صلاحية لهذه العملية", en: "You are not allowed to perform this action" },
  NO_COMPANY: { ar: "لا توجد منشأة مرتبطة بالمستخدم", en: "User has no company" },
};

export function accountingErrorText(message: string, ar: boolean) {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  if (key) return ar ? ERRORS[key]!.ar : ERRORS[key]!.en;
  return message;
}

export const SOURCE_LABELS: Record<string, { ar: string; en: string }> = {
  invoice: { ar: "فاتورة مبيعات", en: "Sales invoice" },
  customer_payment: { ar: "تحصيل من عميل", en: "Customer payment" },
  supplier_invoice: { ar: "فاتورة مورد", en: "Supplier invoice" },
  supplier_payment: { ar: "دفعة لمورد", en: "Supplier payment" },
  debit_note: { ar: "إشعار خصم", en: "Debit note" },
  stock_movement: { ar: "حركة مخزون", en: "Stock movement" },
  voucher: { ar: "سند خزينة", en: "Cash voucher" },
  manual: { ar: "قيد يدوي", en: "Manual entry" },
};

