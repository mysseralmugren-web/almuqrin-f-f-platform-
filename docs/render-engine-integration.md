# Render Engine Integration

This integration connects AlMugren Factory Hub to a cloud Blender-compatible render provider without exposing provider credentials to the browser.

## Architecture

- UI: `/ai-assistant/render`
- Authenticated adapter: Supabase Edge Function `render-engine`
- Tenant audit table: `public.interior_render_jobs`
- Existing digital-twin adapter: `interior-digital-twin` can invoke `render-engine` when a scene specification is available.
- Local fallback: the separate `render_automation_kit` runs directly inside Blender.

## Production configuration

Set these as Supabase Function secrets:

```text
BLENDER_RENDER_WORKER_URL=https://render-worker.example
BLENDER_RENDER_WORKER_KEY=secret
RENDER_CALLBACK_SECRET=random-secret-of-at-least-32-characters
```

The worker base URL must use HTTPS and cannot point to localhost or a `.local` host. The callback secret signs the existing `render-output` upload route.

## Deployment

```bash
supabase db push
supabase functions deploy render-engine
supabase secrets set BLENDER_RENDER_WORKER_URL=... BLENDER_RENDER_WORKER_KEY=... RENDER_CALLBACK_SECRET=...
```

Deploy secrets before using the health test. Keep `RENDER_API_TOKEN` out of Vite variables and browser code.

## Provider request contract

The submit endpoint receives a JSON payload with:

- `prompt`
- `subjectSizeM` (0.1–20)
- `quality`: `draft`, `high`, or `ultra`
- `outputFormat`: `png`, `jpeg`, or `webp`
- `preset`: `studio_three_point` or `softbox_product`
- `engine: cycles`, `denoise: true`, `viewTransform: AgX`
- optional `sceneSpec`, `projectId`, `idempotencyKey`, and tenant metadata

The worker receives `POST /render` and should return `jobId`. When complete, it uploads the result through the signed callback URL supplied in the request.

## Security controls

- Supabase JWT authentication and active profile are mandatory.
- RLS isolates jobs by `company_id` and module permission.
- Provider credentials remain server-side.
- Requests are size-bounded, enum-validated, idempotent, and audited.
- Provider calls are HTTPS-only with timeout and bounded responses.
