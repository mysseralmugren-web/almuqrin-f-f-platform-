---
name: match-invoice-to-purchase-order
description: مطابقة فاتورة المورد مع أمر الشراء واستلام الخامات والدفع بطريقة 2-way/3-way matching.
---

# Purpose
منع اعتماد فاتورة لا تتطابق مع أمر الشراء أو الاستلام.

## Inputs
supplier_invoice, purchase_order, goods_receipt(s), prior_payments.

## Checks
- supplier identity.
- item/description similarity and item_id when available.
- ordered vs received vs invoiced quantity.
- PO unit price vs invoice unit price and allowed tolerance.
- discounts, VAT, freight and other charges.
- prior invoiced/paid amounts against same PO.

## Output
`match_status: matched|partial|mismatch|no_po`, line-level variances, quantity_variance, price_variance, tax_variance, payable_amount, blocking_flags.

## Controls
Invoice cannot be recommended for payment when invoiced quantity exceeds accepted receipt, unless an authorized override reason is recorded.
