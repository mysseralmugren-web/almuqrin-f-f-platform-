# Isolated Supabase Staging

> **Staging-only runbook. Do not apply this directory automatically to Production.**

## Environment

- Project: `almuqrin-platform-staging-isolated`
- Project ref: `selljopynsmecxqzgpra`
- Region: `eu-central-1`
- Source/live schema project used for parity comparison: `vmswbmkkgvnjhznxbsdz`
- Operational customer, employee, invoice, and production rows are intentionally **not copied**.

## Verified schema parity (2026-09-03)

| Layer | Staging | Source/live |
|---|---:|---:|
| Tables | 211 | 211 |
| Enums | 62 | 62 |
| Defaults | 1270 | 1270 |
| Primary keys | 211 | 211 |
| Unique constraints | 115 | 115 |
| Check constraints | 268 | 268 |
| Foreign keys | 604 | 604 |
| Indexes | 515 | 515 |
| Functions | 129 | 129 |
| Triggers | 254 | 254 |
| RLS-enabled tables | 211 | 211 |
| RLS policies | 441 | 441 |
| RLS tables without a policy | 0 | 0 |
| Views | 4 | 4 |
| Realtime publication members | 0 | 0 |
| Cron jobs | 2 | 2 |
| Storage buckets | 6 | 6 |
| Storage policies | 12 | 12 |

## Runtime isolation

The staging database was checked for hard-coded references to the source/live Supabase project ref and returned **0 public function references**.

The source has storage policies referring to `mfg-attachments`, although that bucket does not currently exist there. Staging intentionally reproduces the policies but does **not** invent a bucket missing from the source.

### Cron

- `almuqrin-daily-factory-automation` — `0 4 * * *`
- `almuqrin-platform-automation-sweep` — `*/15 * * * *`

Both execute database-local functions only; no HTTP/source-project target is configured.

### Views

All source views were restored with `security_invoker=true`:

- `ai_material_price_intelligence`
- `ai_twin_skills_effective`
- `financial_ai_summary`
- `platform_automation_health`

### AI static seed

`ai_skill_catalog` contains **35/35 active static skill definitions**. No company/profile/auth/customer seed was copied.

## SECURITY DEFINER hardening in Staging

Staging intentionally tightens direct RPC exposure beyond the source environment:

- `anon` has zero direct `EXECUTE` grants on public `SECURITY DEFINER` functions.
- Trigger-returning functions have zero direct `authenticated` RPC grants.
- Signed-in execution remains only where required for RLS/RBAC helpers and intended application RPCs.
- Explicitly internal worker/cron functions have had `authenticated EXECUTE` revoked.

Do not bulk-revoke helper functions such as `current_company_id`, `has_any_role`, `is_company_admin`, `can_view_project`, or `user_can_module`; RLS policies and application flows depend on them.

## Edge Functions currently deployed in isolated Staging

JWT-required:

- `ai-gateway`
- `knowledge-ingestion`
- `ai-assistant`
- `ai-digital-twin`
- `interior-digital-twin`
- `pdf-catalog-ingestion` — intentionally returns `503` until a staging-only worker secret is configured
- `bootstrap-receiver` — historical bootstrap helper, intentionally disabled and returns `410`

The AI functions use runtime `SUPABASE_URL` / `SUPABASE_ANON_KEY` and do not embed the source project ref.

AI provider secrets are **not copied from the source environment**. Missing provider configuration must fail closed/explicitly rather than fall back to Production credentials.

## Preview binding gate

Vercel Preview must not be switched to Staging until all of the following are true:

1. Preview-only Supabase URL/key variables can be written without changing Production variables.
2. A Staging auth identity/profile exists for authenticated smoke testing.
3. Required staging-only AI/provider secrets have been configured, or the affected feature is intentionally disabled.
4. Security and smoke checks remain green.

Production variables and Production Supabase data must never be used as a workaround for a missing Staging secret.
