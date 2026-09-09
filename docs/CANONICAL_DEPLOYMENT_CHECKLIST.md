# Release checklist — almuqrin-ff-platform

1. Changes intended for release land in `mysseralmugren-web/almuqrin-f-f-platform-`.
2. Run typecheck, production build and security tests.
3. Review the Vercel preview deployment for the pull request.
4. Merge to `main` only after checks pass.
5. Confirm the new Vercel production deployment is READY and inspect runtime errors.
6. Keep Supabase migrations in this repository aligned with the deployed `almuqrin-platform-staging` schema.
