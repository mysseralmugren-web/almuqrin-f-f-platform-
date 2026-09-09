# Smart Lawyer v0.2 — production integration checklist

- [x] Preserve prototype policy defaults and risk rules in TypeScript.
- [x] Preserve credit-release eligibility logic.
- [x] Add regression tests for core policy behavior.
- [ ] Connect rules to the existing `ai-assistant/legal` route UI.
- [ ] Persist policy overrides in Supabase instead of static defaults.
- [ ] Persist legal review decisions and approvals in the platform audit log.
- [ ] Link document analysis to the central files repository and private object storage.
- [ ] Add server-side extraction/OCR pipeline for scanned PDF/images.
- [ ] Route AI/RAG through server-only credentials and approved knowledge sources.
- [ ] Gate high-risk documents and credit releases behind explicit authorized approval.
- [ ] Confirm RLS isolation for every new table/RPC before production rollout.
