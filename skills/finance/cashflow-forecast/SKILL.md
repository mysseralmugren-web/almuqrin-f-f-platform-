---
name: cashflow-forecast
description: توقع التدفق النقدي وربط دفعات العملاء 50/30/20 بالمشتريات والالتزامات والمصروفات.
---

# Purpose
توقع السيولة اليومية/الأسبوعية/الشهرية للمصنع والمشروعات.

## Inputs
opening_cash, customer payment milestones, AR due dates, supplier AP due dates, payroll, recurring expenses, purchase/material plans, taxes.

## Default project schedule
عند وجود نظام دفعات 50% / 30% / 20% استخدمه فقط إذا كان مثبتاً في العقد/أمر البيع، وليس كافتراض عام.

## Outputs
cash_in, cash_out, ending_cash, projected_shortfall, required_working_capital, overdue_cash, scenario bands.

## Rules
- فرّق بين confirmed وexpected cash flows.
- المتأخرات لا تعتبر محصلة حتى يتم تسجيل قبض.
- لا تفترض تاريخ توريد/تحصيل مفقود؛ صنفه uncertain.
