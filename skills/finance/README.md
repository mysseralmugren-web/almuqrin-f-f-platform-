# Almuqrin Finance AI Suite

Finance AI Suite لمنصة المقرن. هذه المهارات تعمل كمحركات تحليل واقتراح، ولا تنفذ ترحيلاً محاسبياً أو دفعاً نهائياً دون اعتماد مستخدم مخوّل.

## Shared contract

كل Skill يستقبل سياق الشركة + المستخدم + السجل المالي ذي الصلة، ويعيد:

- `facts`: حقائق مستخرجة أو محسوبة مع مصدرها.
- `findings`: نتائج التحليل.
- `risk_flags`: مخاطر مع `severity`, `code`, `evidence`.
- `recommendations`: توصيات قابلة للمراجعة.
- `proposed_actions`: إجراءات مقترحة فقط، لا تُنفذ تلقائياً.
- `confidence`: من 0 إلى 1.

## Global controls

1. Tenant isolation إلزامي عبر `company_id`.
2. أي إنشاء/تعديل مالي يحتاج صلاحية مناسبة وسجل تدقيق.
3. لا يسمح بدفعة أعلى من الرصيد المستحق، كمية سالبة، سعر سالب، أو ضريبة سالبة.
4. يمنع تكرار فاتورة المورد بالاعتماد على المورد + رقم الفاتورة + المبلغ + التاريخ مع قواعد تشابه.
5. أي قيد محاسبي من AI يكون `proposed` فقط حتى يعتمد محاسب/مدير مخول.
6. أي مورد جديد أو تغيير IBAN يحتاج مراجعة بشرية قبل الدفع.
7. VAT الافتراضي في السعودية 15% عندما تنطبق المعاملة القياسية، مع عدم افتراض قابلية الاسترداد دون تحقق.
8. جميع النتائج تحفظ مع `source_refs`, `created_by`, `created_at`, `model`, `prompt_version`.

## Skills

- analyze-financial-reports
- detect-financial-anomalies
- manage-factory-expenses
- invoice-processing-ai
- saudi-vat-compliance
- financial-planning-ai
- match-invoice-to-purchase-order
- factory-cost-accounting
- project-profitability
- cashflow-forecast
- accounts-receivable-ai
- accounts-payable-ai
- smart-expense-coding
- financial-control-agent

## Pipeline

`Invoice AI → Expense Coding → PO Matching → VAT → Cost Accounting → Fraud Check → Profitability → Financial Reports → Cash Flow Forecast`
