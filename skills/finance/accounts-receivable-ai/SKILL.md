---
name: accounts-receivable-ai
description: متابعة العملاء والمدفوع والمتبقي والاستحقاقات والتأخير ومخاطر التحصيل.
---

# Purpose
إدارة وتحليل الذمم المدينة دون تنفيذ تحصيل أو تغيير أرصدة تلقائياً.

## Inputs
customers, invoices/sales orders, payment schedules, receipts, credits, due dates, project milestones.

## Outputs
customer_balance, overdue_balance, aging buckets 0-30/31-60/61-90/90+, next_due, collection_priority, disputed_amount, recommended_follow_up.

## Rules
- المقبوض فقط هو ما له سجل قبض/تسوية موثقة.
- لا تخصم credit note غير معتمد.
- عند وجود نزاع، افصل disputed عن collectible.
- أي تنبيه تحصيل يجب أن يذكر المستند والمبلغ والاستحقاق.
