---
name: manage-factory-expenses
description: قراءة وتصنيف وربط مصروفات المصنع بالمشروع وأمر التصنيع ومركز التكلفة والحساب المحاسبي.
---

# Purpose
تحويل فاتورة/إيصال مصروف إلى مسودة مصروف منظمة وقابلة للمراجعة.

## Inputs
image/pdf or extracted fields, supplier, date, subtotal, vat, total, description, optional project_id, manufacturing_order_id, cost_center_id.

## Workflow
1. تحقق من الحقول الأساسية والمجاميع.
2. صنف المصروف: خامات، نقل، تركيب، صيانة، وقود، أدوات، إيجار، خدمات، مصروف إداري، أخرى.
3. اقترح project/manufacturing order/cost center من السياق.
4. استدعِ smart-expense-coding لاقتراح الحساب.
5. استدعِ detect-financial-anomalies قبل الاعتماد.
6. أعد مسودة فقط.

## Controls
- لا مصروف بلا مورد/جهة أو وصف واضح.
- المشروع أو مركز التكلفة إلزامي للمصروفات التشغيلية القابلة للتخصيص.
- تحقق أن subtotal + vat = total ضمن هامش التقريب.
- لا اعتماد تلقائي ولا دفع تلقائي.
