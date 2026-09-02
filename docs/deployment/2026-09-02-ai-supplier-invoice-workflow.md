# AI supplier invoice workflow — 2026-09-02

Implemented an end-to-end, human-approved supplier invoice workflow in the AI module:

- Select a completed `supplier_invoice` AI job.
- Auto-extract supplier name/VAT, invoice number/date and line items.
- Match supplier by VAT first, then normalized Arabic/English name.
- Allow authorized supplier creation when no match exists.
- Review tax treatment and line-level VAT before creation.
- Approve the AI job/recommendation and create a **draft supplier invoice**.
- Preserve the existing safety boundary: no automatic ledger posting or financial approval.
- Link the resulting draft back to the AI job through the existing `applyAiRecommendation` workflow.
