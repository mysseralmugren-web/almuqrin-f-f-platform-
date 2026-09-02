---
name: factory-cost-accounting
description: حساب تكلفة أمر التصنيع من الخامات والعمالة والهدر والمصاريف الصناعية غير المباشرة.
---

# Cost model
`direct_material + direct_labor + subcontract + transport/install + allocated_overhead + waste - recoveries`

## Material categories
خشب/ألواح، إكسسوارات، معدن، زجاج، تنجيد، دهانات، كهرباء/LED، مواد مساعدة.

## Inputs
manufacturing_order, BOM/issues, purchase prices, labor time/rates, waste, overhead allocation rule, subcontract/transport/install costs.

## Outputs
actual_cost, estimated_cost, cost_variance, cost_per_unit, material_cost, labor_cost, overhead_cost, waste_cost, margin_at_current_sale_price.

## Rules
- استخدم تكلفة فعلية عند توفر إصدار مخزني/فاتورة؛ وإلا علّم القيمة estimate.
- لا تخلط VAT القابل للاسترداد مع تكلفة الخامة.
- كل تكلفة يجب أن ترتبط بأمر تصنيع/مشروع أو مركز تكلفة.
- وضح قاعدة توزيع overhead المستخدمة.
