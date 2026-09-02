---
name: smart-expense-coding
description: اقتراح الحساب المحاسبي ومركز التكلفة للمصروف اعتماداً على دليل حسابات مصنع المقرن وسجل الترميزات السابقة.
---

# Purpose
اقتراح Account Coding قابل للمراجعة، مع التعلم من الاختيارات المعتمدة تاريخياً دون تعديل دليل الحسابات تلقائياً.

## Inputs
expense/invoice description, supplier, line items, project/manufacturing order, chart_of_accounts, cost_centers, approved_historical_codings.

## Outputs
`account_id`, `account_code`, `cost_center_id`, optional `project_id`, `confidence`, `reason`, `alternatives[]`.

## Matching order
1. قواعد صريحة من دليل الحسابات.
2. supplier/category mappings المعتمدة.
3. تشابه بنود سبق اعتمادها.
4. semantic suggestion مع بدائل.

## Controls
- confidence أقل من 0.80 لا يطبق تلقائياً حتى على المسودة؛ يطلب اختياراً بشرياً.
- لا ينشئ حساباً جديداً في Chart of Accounts.
- لا يغير mapping معتمد من حالة واحدة؛ التعلم يحتاج نمطاً متكرراً ومراجعة.
- project/cost center مطلوب عندما تكون التكلفة قابلة للتخصيص.
