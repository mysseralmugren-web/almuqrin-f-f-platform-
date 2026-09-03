# SECURITY DEFINER baseline

Baseline date: 2026-09-03.

## Why this exists

The platform uses a number of `SECURITY DEFINER` functions intentionally to support tenant-aware RLS/RBAC helpers and tightly guarded RPC actions. Supabase correctly warns when a signed-in user can execute a `SECURITY DEFINER` function from the exposed `public` schema. Those warnings must be reviewed function-by-function; they must never be silenced by bulk revocation because core RLS policies depend on several helpers.

## Protected core helpers

These functions are intentionally retained as `SECURITY DEFINER` because they are referenced by RLS/RBAC policies and must resolve authorization data without creating policy recursion or exposing cross-tenant rows:

- `current_company_id()`
- `current_employee_id()`
- `has_any_role(text[])`
- `has_role(uuid, app_role)`
- `is_company_admin()`
- `is_hr_staff()`
- `is_payroll_staff()`
- `is_project_staff()`
- `is_comms_admin()`
- `is_comms_staff()`
- `is_portal_customer()`
- `is_manager_of(uuid)`
- `my_customer_ids()`
- `can_view_project(uuid)`
- `can_edit_project(uuid)`
- `can_view_employee(uuid)`
- `can_ai_kind(ai_job_kind)`
- `can_access_document_kind(doc_template_kind, boolean)`
- `user_can_module(text, text)`

Changing these helpers to invoker mode or revoking authenticated execute requires a dedicated RLS dependency migration and regression test. Do not change them in a generic hardening patch.

## Intentional authenticated RPC actions

The following categories are designed to be callable by signed-in users and perform their own authorization and tenant checks before privileged writes:

- analytics read RPCs (`analytics_*`)
- catalog/store review and approval RPCs
- design-asset attachment RPCs
- vendor invoice review RPCs

Every new privileged RPC must include explicit actor/tenant/role validation, an explicit `search_path`, and no `PUBLIC` execute grant.

## CI rule for new migrations

For migrations at or after the post-baseline cutoff, every new `SECURITY DEFINER` function must:

1. include `-- security-definer: reviewed`;
2. pin `SET search_path` explicitly;
3. never grant `EXECUTE` to `PUBLIC`;
4. if executable by `authenticated`, include `-- security-definer-authenticated-rpc: intentional` and contain or call an authorization guard.

The CI gate is `scripts/security/security-definer-governance.mjs`.

## Current remaining external Auth warning

Supabase Leaked Password Protection is a Pro-plan feature. It should be enabled when the organization is on Pro; until then, use strong password requirements and MFA for privileged accounts. This warning is not resolved by a database migration.
