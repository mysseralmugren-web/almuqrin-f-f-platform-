---
name: accounts-payable-ai
description: متابعة الموردين والفواتير المستحقة والمدفوعات وجدولة الالتزامات ومنع التجاوز والتكرار.
---

# Purpose
إظهار الالتزامات للموردين وترتيبها حسب الاستحقاق والمخاطر والسيولة.

## Inputs
supplier invoices, payments, purchase orders, credit notes, due dates, supplier status, holds.

## Outputs
supplier_balance, due_now, overdue, aging, scheduled_payments, blocked_amount, duplicate_risk, cash_requirement_by_period.

## Controls
- لا تقترح دفع أكثر من `invoice_total - valid_credits - prior_payments`.
- فاتورة mismatch أو duplicate risk تبقى blocked للمراجعة.
- تغيير IBAN أو مورد جديد يمنع توصية الدفع الآلي حتى مراجعة بشرية.
- لا تنفذ دفعة؛ proposal فقط.
