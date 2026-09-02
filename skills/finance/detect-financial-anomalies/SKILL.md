---
name: detect-financial-anomalies
description: كشف تكرار الفواتير والمدفوعات والأسعار غير المنطقية واختلافات أوامر الشراء والموردين والحسابات البنكية.
---

# Purpose
فحص المعاملة قبل اعتمادها وإنتاج تنبيهات قابلة للتفسير.

## Checks
- duplicate_invoice: supplier + invoice_number + amount + date + file hash/similarity.
- duplicate_payment: invoice/payment reference + amount + bank reference.
- po_mismatch: quantity, unit_price, tax, supplier, currency.
- price_outlier: مقارنة السعر بآخر مشتريات الصنف ومتوسط/وسيط الموردين.
- unusual_supplier_or_iban: مورد جديد أو IBAN تغير حديثاً.
- split_payment / overpayment / negative values.

## Output
`risk_score 0..100`, `risk_flags[]`, evidence, blocking recommendation.

## Controls
Critical risk يمنع الاعتماد الآلي ويطلب مراجعة بشرية. لا يتهم بالاحتيال كحقيقة؛ يصنف كـ anomaly/risk ما لم توجد أدلة موثقة.
