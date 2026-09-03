# AlMuqrin isolated Staging bootstrap

## Environment

- Supabase project: `almuqrin-platform-staging-isolated`
- Project ref: `selljopynsmecxqzgpra`
- Region: `eu-central-1`
- Purpose: isolated pre-production validation only.
- Production ref `vmswbmkkgvnjhznxbsdz` must never be embedded in Staging database functions or Edge Function source.
- Production customer, HR, invoice, payment, project, WhatsApp and other operational records are not seed data and must not be copied into Staging.

## Verified database baseline — 2026-09-03

| Object | Expected |
|---|---:|
| Enums | 62 |
| Tables | 211 |
| Defaults | 1270 |
| Primary keys | 211 |
| Unique constraints | 115 |
| Check constraints | 268 |
| Foreign keys | 604 |
| Indexes | 515 |
| Functions | 129 |
| Triggers | 254 |
| RLS-enabled public tables | 211 |
| Public RLS policies | 441 |
| RLS tables without a policy | 0 |
| Public views | 4 |
| Materialized views | 0 |
| Storage buckets | 6 |
| Storage policies | 12 |

The four public views are `ai_material_price_intelligence`, `ai_twin_skills_effective`, `financial_ai_summary`, and `platform_automation_health`; each is configured with `security_invoker=true`.

## Isolation gates

1. `dispatch_pdf_catalog_worker()` is fail-closed in Staging. It must never call the Production Supabase URL.
2. `pdf-catalog-ingestion` remains disabled in isolated Staging until a Staging-only worker secret is configured and verified.
3. `bootstrap-receiver` is permanently disabled (HTTP 410 implementation, JWT required). Do not restore an arbitrary SQL execution endpoint.
4. Scheduled jobs `almuqrin-daily-factory-automation` and `almuqrin-platform-automation-sweep` exist for parity but are `active=false` in Staging until smoke testing and Staging-only seed data are complete.
5. Only publishable/anon keys may be used by the browser. Never place a service-role key in Vercel frontend variables.
6. Vercel Preview must not be pointed at Staging until a real Staging auth/profile/company test identity exists and Preview-only environment variables can be configured without changing Production.

## Safe seed policy

Global/reference data may be seeded when it has no customer or employee identity. Current verified global seed: `ai_skill_catalog = 35` skills.

Company-bound records such as `role_module_permissions`, `platform_automation_rules`, `store_categories`, `store_settings`, and `cloud_runtime_environments` must be generated for the Staging company identity rather than copied with Production IDs. Never fabricate an `auth.users` row.

## SECURITY DEFINER

The Supabase Security Advisor currently reports legacy `SECURITY DEFINER` RPC warnings. These are not treated as globally clean. Existing RLS/RBAC helper functions are retained during bootstrap to avoid breaking authorization. New functions are governed by repository CI: explicit safe `search_path`, no unintended PUBLIC execute surface, and explicit authorization for privileged RPCs. Perform dependency-aware hardening separately.

## Source of truth

The isolated Staging database currently retains the complete bootstrap statements in `supabase_migrations.schema_migrations.statements`. Use `scripts/export-staging-bootstrap.sh` to materialize those statements into versioned `.sql` files from an authorized local/CI connection, then review them before merge. Do not paste database credentials into the repository.
