---
name: material-price-intelligence
description: استخراج أسعار خامات المصنع من صور/PDF الفواتير والإيصالات، تطبيع الوحدات والضريبة، وحفظ سجل سعر تاريخي لاستخدامه في عروض الأسعار وتكلفة التصنيع.
---

# Purpose
استخدم هذه المهارة عندما يرفع المستخدم صورة أو PDF لفاتورة شراء خامات أو إيصال مورد ويريد تحديث أسعار الخامات للمصنع أو استخدامها في التسعير وتكلفة التصنيع.

# Pipeline
`image/PDF → quality check → document enhancement → invoice extraction → line normalization → material matching → VAT normalization → duplicate/uncertainty check → price-history proposal → human review → save`

## Required inputs
- company_id
- source document: image or PDF
- supplier information when readable
- invoice date and invoice number when readable
- line items with description, quantity, unit, unit price, subtotal/VAT/total when available

## Image handling
Before extraction, assess legibility and apply document-image enhancement when needed: crop page edges, deskew, perspective correction, shadow/glare reduction, contrast and sharpness improvement. Never invent unreadable text. Mark uncertain fields explicitly.

## Normalized output per material
- material_key: stable normalized identifier
- description_ar
- supplier_name
- supplier_vat_number if present
- invoice_number if present
- observed_on
- unit
- quantity
- unit_price_ex_vat
- vat_rate
- unit_price_inc_vat
- currency
- confidence
- source_reference
- notes

## Pricing rules
- Store `unit_price_ex_vat` as the manufacturing-cost reference price when VAT is recoverable.
- Preserve the VAT-inclusive amount for invoice reconciliation and cash-outflow analysis.
- Do not overwrite older observations. Append to `material_price_history` so trends remain auditable.
- Current quotation/manufacturing price is selected from the latest reliable observation unless the user or pricing policy selects an average, supplier-specific price, or safety buffer.
- For repeated purchases, calculate current price, previous price, average/min/max of recent observations, percentage change, and trend.
- Normalize comparable dimensions before comparing prices. Example: foam sheets may also expose SAR/m³; boards may expose SAR/sheet and optionally SAR/m²; profiles may expose SAR/piece and SAR/m.

## Validation
- quantity must be > 0.
- unit price must be >= 0.
- Saudi VAT is normally 15% when the invoice line is standard-rated; do not force 15% when the source is exempt/out-of-scope or evidence differs.
- Check `subtotal + VAT ≈ total` using invoice rounding tolerance.
- Flag duplicate invoice/line observations before save.
- If description or unit is materially uncertain, save only after human confirmation or mark the observation as unresolved; do not silently map it to an existing material.
- Prefer invoice date over upload date for `observed_on`.

## Platform integration
Primary history table: `material_price_history`.
Analytics/current-price source: `ai_material_price_intelligence`.
The Skill should feed quotation pricing, factory cost accounting, purchase analysis, supplier comparison, and manufacturing BOM costing.

## Suggested quotation use
For each required material:
`required_quantity × selected_material_price + waste_allowance = material_cost`
Then combine materials with labor, machine time, finishing/upholstery, transport/installation where applicable, indirect factory overhead, margin policy, and VAT to produce the quotation.

## Safety and governance
- Extraction and price updates are evidence-based; never fabricate unreadable invoice data.
- Low-confidence lines require human review before becoming an approved reference price.
- This Skill does not approve supplier invoices, create payments, post accounting journals, or change supplier bank information.
- Maintain company_id tenant isolation for every saved observation.
