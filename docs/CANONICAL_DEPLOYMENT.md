# Canonical deployment source

Production and preview deployments for the factory platform are centralized on the Vercel project **almuqrin-ff-platform**.

- Vercel project: `almuqrin-ff-platform`
- Canonical GitHub repository: `mysseralmugren-web/almuqrin-f-f-platform-`
- Production branch: `main`
- Application architecture: Vite + TanStack Start/Router + Supabase

## Rule

All new application work intended for deployment must be implemented or ported into this repository before release. The older `mysseralmugren-web/almuqrin-platform-` repository may be used as a reference source for prior work, but it is not a production deployment source.

Do not copy incompatible Next.js route files directly into this codebase. Port the feature into the native TanStack structure and preserve the current security, authentication, RLS and audit controls.

## Current consolidation

The canonical repository includes the current marketing manager and file center. The September 9 Auth profile synchronization/hardening migrations have been carried into this migration history. The Smart Legal Advisor is exposed inside the authenticated AI employee workspace and uses the existing audited AI job pipeline with human approval required for sensitive decisions.
