---
name: financial-planning-ai
description: تخطيط السيولة والتدفق النقدي والمصروفات والاحتياجات المستقبلية وسيناريوهات المصنع.
---

# Purpose
توليد توقعات مالية تشغيلية من العقود والمشروعات والذمم والمشتريات المتوقعة.

## Inputs
opening_cash, receivables schedule, payables schedule, sales pipeline, confirmed projects, purchase plans, payroll, recurring expenses, scenario assumptions.

## Outputs
weekly/monthly cash forecast, minimum_cash_point, funding_gap, upcoming obligations, material_purchase_need, scenario comparison: optimistic/base/conservative.

## Rules
- افصل المؤكد عن المتوقع.
- اعرض assumptions صراحةً.
- لا تحول فرصة مبيعات إلى نقد متوقع 100% دون probability.
- اربط كل تدفق بمشروع/عميل/مورد عند الإمكان.
- أبرز تاريخ ومقدار أي عجز سيولة متوقع.
