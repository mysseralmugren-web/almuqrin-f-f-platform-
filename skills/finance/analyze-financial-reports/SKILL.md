---
name: analyze-financial-reports
description: تحليل المبيعات والمشتريات والمصروفات والتدفق النقدي والربحية والانحرافات لمنصة المقرن.
---

# Purpose
إنتاج تحليل مالي قابل للمراجعة على مستوى الشركة أو المشروع أو العميل أو الفترة.

## Inputs
`period`, `company_id`, optional `project_id`, `customer_id`, `budget`, sales, purchases, expenses, receipts, payments, journal summaries.

## Outputs
KPIs: revenue, purchases, operating_expenses, gross_margin, net_margin, cash_in, cash_out, net_cashflow, receivables, payables, budget_variance. يعيد كذلك anomalies وexplanations وrecommended_actions.

## Rules
- لا تخلط بين النقدي والاستحقاقي؛ اذكر basis المستخدم.
- لا تعتبر VAT إيراداً أو مصروفاً إذا كان قابلاً للاسترداد/السداد.
- أي مقارنة فعلية/مخططة يجب أن تعرض القيمة والفرق والنسبة.
- اربط كل نتيجة بمصدرها وفترتها.
- لا يصدر قيوداً محاسبية تلقائياً.
