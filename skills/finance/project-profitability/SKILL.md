---
name: project-profitability
description: حساب ربحية كل مشروع وعميل من سعر البيع والتكلفة الفعلية والمصروفات المباشرة وغير المباشرة.
---

# Formula
`net_project_profit = recognized_sales - materials - direct_labor - subcontract - transport - installation - allocated_overhead - project_expenses`

## Inputs
project/sales order, invoices/receipts, manufacturing costs, expenses, returns/credits, allocation policy.

## Outputs
revenue, collected, outstanding, direct_cost, allocated_cost, gross_profit, net_profit, gross_margin_pct, net_margin_pct, cost_variance, margin_risk.

## Rules
- اعرض الربحية على أساس الإيراد المعترف به، مع إظهار النقد المحصل منفصلاً.
- افصل change orders والإضافات عن العقد الأصلي عند توفرها.
- لا تعتبر دفعة مقدمة ربحاً بذاتها.
- اشرح أي تكلفة غير مخصصة أو ناقصة قبل إعطاء هامش نهائي.
