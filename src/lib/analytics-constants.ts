/** Module 12 — central KPI catalogue. No hardcoded financial constants: every value is computed from live data. */

export type KpiScope =
  | "executive"
  | "sales"
  | "manufacturing"
  | "inventory"
  | "purchasing"
  | "finance"
  | "hr"
  | "projects";

export interface KpiDef {
  key: string;
  scope: KpiScope;
  nameAr: string;
  nameEn: string;
  formulaAr: string;
  sourceAr: string;
  /** Refresh cadence in plain Arabic */
  refreshAr: string;
  /** Roles allowed to see the KPI; empty = every authenticated user in the company */
  roles?: string[];
}

const ADMIN = ["super_admin", "factory_owner", "general_manager"];
export const FINANCE_ROLES = [...ADMIN, "accountant"];
export const HR_ROLES = [...ADMIN, "hr"];
export const COST_ROLES = [...FINANCE_ROLES, "production_manager", "purchasing_manager"];

export const KPI_CATALOG: KpiDef[] = [
  // Sales
  { key: "sales_total", scope: "sales", nameAr: "إجمالي المبيعات", nameEn: "Sales total", formulaAr: "مجموع إجمالي أوامر البيع غير الملغاة خلال الفترة", sourceAr: "sales_orders.total", refreshAr: "لحظي عند فتح التقرير" },
  { key: "quote_conversion", scope: "sales", nameAr: "معدل تحويل عروض الأسعار", nameEn: "Quotation conversion", formulaAr: "(عدد العروض المقبولة ÷ عدد العروض غير المسودة) × 100، وتُهمل القسمة عند الصفر", sourceAr: "quotations.status" , refreshAr: "لحظي" },
  { key: "avg_order_value", scope: "sales", nameAr: "متوسط قيمة الأمر", nameEn: "Average order value", formulaAr: "إجمالي أوامر البيع ÷ عددها (يُرجع صفرًا عند عدم وجود أوامر)", sourceAr: "sales_orders", refreshAr: "لحظي" },
  { key: "collections", scope: "sales", nameAr: "التحصيل", nameEn: "Collections", formulaAr: "مجموع الدفعات المستلمة بتاريخ سداد داخل الفترة", sourceAr: "payments.amount", refreshAr: "لحظي" },
  { key: "overdue_amount", scope: "sales", nameAr: "المتأخرات", nameEn: "Overdue receivables", formulaAr: "مجموع دفعات الجدول غير المسددة وتاريخ استحقاقها قبل اليوم بتوقيت الرياض", sourceAr: "payment_schedules", refreshAr: "لحظي" },
  // Manufacturing
  { key: "mo_lead_time", scope: "manufacturing", nameAr: "زمن دورة التصنيع", nameEn: "MO lead time", formulaAr: "متوسط (تاريخ الانتهاء الفعلي − تاريخ البدء الفعلي) بالأيام", sourceAr: "manufacturing_orders", refreshAr: "لحظي" },
  { key: "mo_late", scope: "manufacturing", nameAr: "أوامر التصنيع المتأخرة", nameEn: "Late MOs", formulaAr: "أوامر لم تُسلَّم/تجهز وتاريخ نهايتها المخططة أقدم من اليوم", sourceAr: "manufacturing_orders.planned_end", refreshAr: "لحظي" },
  { key: "qc_pass_rate", scope: "manufacturing", nameAr: "نسبة اجتياز الجودة", nameEn: "QC pass rate", formulaAr: "(فحوص ناجحة ÷ إجمالي الفحوص) × 100", sourceAr: "quality_inspections", refreshAr: "لحظي" },
  { key: "labor_cost", scope: "manufacturing", nameAr: "تكلفة العمالة", nameEn: "Labor cost", formulaAr: "مجموع (الساعات × أجر الساعة) من سجلات العمالة", sourceAr: "labor_logs", refreshAr: "لحظي", roles: COST_ROLES },
  // Inventory
  { key: "stock_value", scope: "inventory", nameAr: "قيمة المخزون", nameEn: "Stock value", formulaAr: "مجموع (الرصيد × التكلفة المعيارية للصنف)", sourceAr: "stock_balances × items.standard_cost", refreshAr: "لحظي", roles: COST_ROLES },
  { key: "shortages", scope: "inventory", nameAr: "أصناف تحت الحد الأدنى", nameEn: "Shortage items", formulaAr: "الأصناف النشطة التي رصيدها الإجمالي أقل من الحد الأدنى المعرّف", sourceAr: "items.min_qty", refreshAr: "لحظي" },
  { key: "material_consumption", scope: "inventory", nameAr: "استهلاك المواد", nameEn: "Material consumption", formulaAr: "مجموع كميات حركات الصرف لأوامر التصنيع خلال الفترة", sourceAr: "stock_movements(issue_to_mfg)", refreshAr: "لحظي" },
  // Purchasing
  { key: "po_total", scope: "purchasing", nameAr: "قيمة أوامر الشراء", nameEn: "PO value", formulaAr: "مجموع إجمالي أوامر الشراء بتاريخ أمر داخل الفترة", sourceAr: "purchase_orders.total", refreshAr: "لحظي" },
  { key: "grn_on_time", scope: "purchasing", nameAr: "التوريد في الموعد", nameEn: "On-time receipts", formulaAr: "(الاستلامات التي تاريخها ≤ التاريخ المتوقع ÷ إجمالي الاستلامات) × 100", sourceAr: "goods_receipts × purchase_orders.expected_date", refreshAr: "لحظي" },
  { key: "payables", scope: "purchasing", nameAr: "مستحقات الموردين", nameEn: "Payables", formulaAr: "مجموع فواتير الموردين المعتمدة/المطابقة غير المسددة", sourceAr: "supplier_invoices", refreshAr: "لحظي" },
  // Finance
  { key: "revenue", scope: "finance", nameAr: "الإيرادات", nameEn: "Revenue", formulaAr: "مجموع (دائن − مدين) لحسابات الإيراد من القيود المرحّلة فقط", sourceAr: "journal_entry_lines × chart_of_accounts", refreshAr: "لحظي", roles: FINANCE_ROLES },
  { key: "expenses", scope: "finance", nameAr: "المصروفات", nameEn: "Expenses", formulaAr: "مجموع (مدين − دائن) لحسابات المصروف من القيود المرحّلة فقط", sourceAr: "journal_entry_lines", refreshAr: "لحظي", roles: FINANCE_ROLES },
  { key: "net_result", scope: "finance", nameAr: "صافي النتيجة", nameEn: "Net result", formulaAr: "الإيرادات − المصروفات", sourceAr: "journal_entries(posted)", refreshAr: "لحظي", roles: FINANCE_ROLES },
  { key: "vat_net", scope: "finance", nameAr: "صافي ضريبة القيمة المضافة", nameEn: "Net VAT", formulaAr: "ضريبة المخرجات (فواتير المبيعات) − ضريبة المدخلات (فواتير الموردين غير المسودة)", sourceAr: "invoices.vat_amount − supplier_invoices.vat_amount", refreshAr: "لحظي", roles: FINANCE_ROLES },
  { key: "production_cost", scope: "finance", nameAr: "تكلفة الإنتاج", nameEn: "Production cost", formulaAr: "تكلفة المواد المصروفة + تكلفة العمالة خلال الفترة", sourceAr: "stock_movements + labor_logs", refreshAr: "لحظي", roles: FINANCE_ROLES },
  // HR
  { key: "headcount", scope: "hr", nameAr: "عدد الموظفين النشطين", nameEn: "Active headcount", formulaAr: "عدد الموظفين بحالة نشط", sourceAr: "employees.status", refreshAr: "لحظي", roles: HR_ROLES },
  { key: "attendance_rate", scope: "hr", nameAr: "نسبة الحضور", nameEn: "Attendance rate", formulaAr: "(حضور + تأخير) ÷ (حضور + تأخير + غياب) × 100", sourceAr: "attendance_records", refreshAr: "لحظي", roles: HR_ROLES },
  { key: "payroll_net", scope: "hr", nameAr: "صافي الرواتب", nameEn: "Net payroll", formulaAr: "مجموع صافي مسيّرات الرواتب المعتمدة/المدفوعة في الفترة", sourceAr: "payroll_runs.total_net", refreshAr: "عند اعتماد المسيّر", roles: HR_ROLES },
  // Projects
  { key: "projects_on_time", scope: "projects", nameAr: "المشاريع المسلّمة في موعدها", nameEn: "On-time projects", formulaAr: "المشاريع المكتملة التي تاريخ إنهائها الفعلي ≤ التاريخ المستهدف", sourceAr: "projects", refreshAr: "لحظي" },
  { key: "claims_sla", scope: "projects", nameAr: "مطالبات تجاوزت SLA", nameEn: "SLA-breached claims", formulaAr: "مطالبات ضمان مفتوحة تجاوز موعد SLA الخاص بها الوقت الحالي", sourceAr: "warranty_claims.sla_due_at", refreshAr: "لحظي" },
  { key: "claim_resolution", scope: "projects", nameAr: "متوسط زمن إغلاق المطالبة", nameEn: "Avg claim resolution", formulaAr: "متوسط (تاريخ الإغلاق − تاريخ البلاغ) بالساعات", sourceAr: "warranty_claims", refreshAr: "لحظي" },
];

export const RIYADH_TZ = "Asia/Riyadh";

export function analyticsErrorText(msg: string, ar: boolean) {
  if (msg.includes("NO_COMPANY")) return ar ? "لا توجد منشأة مرتبطة بحسابك" : "No company linked to your account";
  if (msg.includes("FORBIDDEN_FINANCE")) return ar ? "لا تملك صلاحية عرض البيانات المالية" : "No permission to view finance data";
  if (msg.includes("FORBIDDEN_HR")) return ar ? "لا تملك صلاحية عرض بيانات الموارد البشرية" : "No permission to view HR data";
  if (msg.includes("Unauthorized")) return ar ? "انتهت الجلسة، أعد تسجيل الدخول" : "Session expired, please sign in again";
  return ar ? `تعذر تحميل التقرير: ${msg}` : `Failed to load report: ${msg}`;
}

/** Riyadh-local ISO date (YYYY-MM-DD) */
export function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RIYADH_TZ }).format(new Date());
}

export function riyadhMonthStart() {
  return `${riyadhToday().slice(0, 7)}-01`;
}

export function pct(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

