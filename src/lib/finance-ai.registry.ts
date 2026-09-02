export type FinanceSkillId =
  | "finance-ai-orchestrator"
  | "analyze-financial-reports"
  | "detect-financial-anomalies"
  | "manage-factory-expenses"
  | "invoice-processing-ai"
  | "saudi-vat-compliance"
  | "quarterly-zatca-financial-statements"
  | "financial-planning-ai"
  | "match-invoice-to-purchase-order"
  | "factory-cost-accounting"
  | "project-profitability"
  | "cashflow-forecast"
  | "accounts-receivable-ai"
  | "accounts-payable-ai"
  | "smart-expense-coding"
  | "financial-control-agent";

export type FinanceSkillDefinition = {
  id: FinanceSkillId;
  nameAr: string;
  nameEn: string;
  category: "orchestration" | "invoice" | "control" | "tax" | "cost" | "planning" | "receivables" | "payables" | "reporting";
  descriptionAr: string;
  dependencies: FinanceSkillId[];
  humanApprovalRequired: boolean;
  highImpactAction: boolean;
};

export const FINANCE_AI_SKILLS: FinanceSkillDefinition[] = [
  { id: "finance-ai-orchestrator", nameAr: "منسق المالية الذكي", nameEn: "Finance AI Orchestrator", category: "orchestration", descriptionAr: "يوجه العمليات المالية إلى المهارات المناسبة ويطبق بوابة الرقابة.", dependencies: ["financial-control-agent"], humanApprovalRequired: true, highImpactAction: false },
  { id: "invoice-processing-ai", nameAr: "معالجة الفواتير", nameEn: "Invoice Processing AI", category: "invoice", descriptionAr: "استخراج وتطبيع فاتورة المورد وتحويلها إلى مسودة قابلة للمراجعة.", dependencies: ["match-invoice-to-purchase-order", "saudi-vat-compliance", "smart-expense-coding", "detect-financial-anomalies"], humanApprovalRequired: true, highImpactAction: true },
  { id: "manage-factory-expenses", nameAr: "إدارة مصروفات المصنع", nameEn: "Factory Expense Management", category: "invoice", descriptionAr: "تصنيف المصروف وربطه بالمشروع أو أمر التصنيع ومركز التكلفة.", dependencies: ["saudi-vat-compliance", "smart-expense-coding", "detect-financial-anomalies"], humanApprovalRequired: true, highImpactAction: true },
  { id: "match-invoice-to-purchase-order", nameAr: "مطابقة الفاتورة بأمر الشراء", nameEn: "Invoice to PO Matching", category: "invoice", descriptionAr: "مطابقة الفاتورة مع أمر الشراء والاستلام والمدفوعات السابقة.", dependencies: ["detect-financial-anomalies"], humanApprovalRequired: true, highImpactAction: true },
  { id: "saudi-vat-compliance", nameAr: "الضريبة والامتثال السعودي", nameEn: "Saudi VAT Compliance", category: "tax", descriptionAr: "فحص ضريبة المدخلات والمخرجات واكتمال الفاتورة الضريبية.", dependencies: [], humanApprovalRequired: true, highImpactAction: true },
  { id: "quarterly-zatca-financial-statements", nameAr: "القوائم المالية الربع سنوية · زاتكا", nameEn: "Quarterly ZATCA Financial Statements", category: "reporting", descriptionAr: "إعداد قائمة المركز المالي والربح أو الخسارة والتدفقات النقدية والتغيرات في حقوق الملكية مع جداول VAT والمطابقات الزكوية/الضريبية المرجعية وبوابة اعتماد بشري.", dependencies: ["analyze-financial-reports", "saudi-vat-compliance", "project-profitability", "cashflow-forecast", "detect-financial-anomalies", "financial-control-agent"], humanApprovalRequired: true, highImpactAction: true },
  { id: "smart-expense-coding", nameAr: "الترميز المحاسبي الذكي", nameEn: "Smart Expense Coding", category: "control", descriptionAr: "اقتراح الحساب المحاسبي ومركز التكلفة من دليل الحسابات والسجل المعتمد.", dependencies: [], humanApprovalRequired: true, highImpactAction: true },
  { id: "detect-financial-anomalies", nameAr: "كشف الأخطاء والشذوذ المالي", nameEn: "Financial Anomaly Detection", category: "control", descriptionAr: "كشف التكرار والأسعار غير المنطقية والتجاوزات والتغييرات الحساسة.", dependencies: [], humanApprovalRequired: true, highImpactAction: false },
  { id: "financial-control-agent", nameAr: "وكيل الرقابة المالية", nameEn: "Financial Control Agent", category: "control", descriptionAr: "بوابة منع موحدة قبل أي إجراء مالي عالي التأثير.", dependencies: ["detect-financial-anomalies"], humanApprovalRequired: true, highImpactAction: true },
  { id: "factory-cost-accounting", nameAr: "تكلفة أوامر التصنيع", nameEn: "Factory Cost Accounting", category: "cost", descriptionAr: "حساب تكلفة الخامات والعمالة والهدر والمصاريف الصناعية.", dependencies: [], humanApprovalRequired: false, highImpactAction: false },
  { id: "project-profitability", nameAr: "ربحية المشاريع", nameEn: "Project Profitability", category: "cost", descriptionAr: "حساب هامش وربح المشروع من الإيراد والتكلفة الفعلية والمخصصة.", dependencies: ["factory-cost-accounting"], humanApprovalRequired: false, highImpactAction: false },
  { id: "accounts-receivable-ai", nameAr: "ذمم العملاء", nameEn: "Accounts Receivable AI", category: "receivables", descriptionAr: "متابعة المدفوع والمتبقي والاستحقاقات والتأخير ومخاطر التحصيل.", dependencies: [], humanApprovalRequired: false, highImpactAction: false },
  { id: "accounts-payable-ai", nameAr: "ذمم الموردين", nameEn: "Accounts Payable AI", category: "payables", descriptionAr: "متابعة الفواتير المستحقة وجدولة الالتزامات ومنع الدفع الزائد.", dependencies: ["financial-control-agent"], humanApprovalRequired: true, highImpactAction: true },
  { id: "cashflow-forecast", nameAr: "توقع التدفق النقدي", nameEn: "Cash Flow Forecast", category: "planning", descriptionAr: "توقع السيولة وربط المقبوضات المتوقعة بالالتزامات والمشتريات.", dependencies: ["accounts-receivable-ai", "accounts-payable-ai"], humanApprovalRequired: false, highImpactAction: false },
  { id: "financial-planning-ai", nameAr: "التخطيط المالي", nameEn: "Financial Planning AI", category: "planning", descriptionAr: "سيناريوهات السيولة والمصروفات والاحتياجات المستقبلية.", dependencies: ["cashflow-forecast"], humanApprovalRequired: false, highImpactAction: false },
  { id: "analyze-financial-reports", nameAr: "التحليل المالي والتقارير", nameEn: "Financial Reports Analysis", category: "reporting", descriptionAr: "تحليل المبيعات والمشتريات والمصروفات والربحية والانحرافات والتدفق النقدي.", dependencies: ["project-profitability", "cashflow-forecast"], humanApprovalRequired: false, highImpactAction: false },
];

export const FINANCE_AI_PIPELINES = {
  supplierInvoice: ["invoice-processing-ai", "match-invoice-to-purchase-order", "saudi-vat-compliance", "smart-expense-coding", "detect-financial-anomalies", "financial-control-agent"] as FinanceSkillId[],
  expense: ["manage-factory-expenses", "saudi-vat-compliance", "smart-expense-coding", "detect-financial-anomalies", "financial-control-agent"] as FinanceSkillId[],
  manufacturing: ["factory-cost-accounting", "project-profitability", "analyze-financial-reports"] as FinanceSkillId[],
  liquidity: ["accounts-receivable-ai", "accounts-payable-ai", "cashflow-forecast", "financial-planning-ai"] as FinanceSkillId[],
  quarterlyCompliance: ["analyze-financial-reports", "project-profitability", "cashflow-forecast", "saudi-vat-compliance", "detect-financial-anomalies", "quarterly-zatca-financial-statements", "financial-control-agent"] as FinanceSkillId[],
};
