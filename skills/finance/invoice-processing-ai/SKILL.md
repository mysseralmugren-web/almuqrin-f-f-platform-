---
name: invoice-processing-ai
description: معالجة فاتورة المورد من صورة/PDF حتى مسودة فاتورة ومطابقة وضريبة وقيد محاسبي مقترح.
---

# Pipeline
`document → extraction → supplier match → duplicate check → PO/GRN match → VAT validation → expense/account coding → proposed journal → human approval`

## Required extracted fields
supplier_name, supplier_vat_number, invoice_number, invoice_date, currency, subtotal, vat_amount, total, lines[].

## Validation
- totals reconcile within 0.02 SAR unless source rounding explains more.
- Saudi VAT number, when present, must be 15 digits.
- invoice number required before creating supplier invoice draft.
- duplicate check must pass or be explicitly overridden by authorized reviewer.
- each line quantity > 0 and unit_price >= 0.

## Outputs
Normalized invoice draft, matched supplier, matching status, VAT assessment, proposed expense/account codes, risk flags, proposed journal entry.

## Safety
The journal entry is proposal-only. No posting, payment, supplier bank change, or final approval may be performed by this Skill.
