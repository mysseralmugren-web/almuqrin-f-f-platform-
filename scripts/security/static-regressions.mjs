import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const setup = read("src/lib/setup.functions.ts");
const authMiddleware = read("src/integrations/supabase/auth-middleware.ts");
const migration = read("supabase/migrations/20260814000000_module13_security_closure.sql");
const website = read("src/routes/api/public/website.submit.ts");
const whatsapp = read("src/routes/api/public/whatsapp.webhook.ts");
const ai = read("src/lib/ai.functions.ts");
const constants = read("src/lib/documents-constants.ts");
const serverClient = read("src/integrations/supabase/client.server.ts");
const vercel = read("vercel.json");
const renderEngine = read("supabase/functions/render-engine/index.ts");
const renderMigration = read("supabase/migrations/20260905230000_render_engine_hardening_v2.sql");

let passed = 0;
function contains(name, source, pattern) {
  assert.match(source, pattern, name);
  passed += 1;
  console.log(`PASS  ${name}`);
}
function excludes(name, source, pattern) {
  assert.doesNotMatch(source, pattern, name);
  passed += 1;
  console.log(`PASS  ${name}`);
}

contains(
  "bootstrap requires a server-only high-entropy token",
  setup,
  /process\.env\["BOOTSTRAP_TOKEN"\][\s\S]*length < 32/,
);
contains("bootstrap takes an atomic database claim", setup, /platform_bootstrap_claims/);
excludes(
  "bootstrap no longer authorizes a public contact email",
  setup,
  /BOOTSTRAP_ADMIN_EMAIL|gmail\.com/i,
);
contains("server middleware rejects inactive profiles", authMiddleware, /!profile\?\.is_active/);
contains(
  "server middleware requires a tenant-aligned role",
  authMiddleware,
  /\.eq\('company_id', profile\.company_id\)/,
);
contains(
  "custom platform domain is production, never preview",
  authMiddleware,
  /platform\.almuqrinfurniturefactory\.com/,
);
contains(
  "server client pins production to the approved Supabase project",
  serverClient,
  /candidate !== PRODUCTION_SUPABASE_URL/,
);
contains(
  "deployment sends baseline browser security headers",
  vercel,
  /X-Content-Type-Options[\s\S]*X-Frame-Options[\s\S]*Referrer-Policy[\s\S]*Permissions-Policy/,
);
contains(
  "render provider URL is server-configured and HTTPS-only",
  renderEngine,
  /Deno\.env\.get\("BLENDER_RENDER_WORKER_URL"\)[\s\S]*base\.protocol !== "https:"/,
);
contains(
  "render provider token remains server-side",
  renderEngine,
  /Deno\.env\.get\("BLENDER_RENDER_WORKER_KEY"\)/,
);
contains("render requests are idempotent", renderEngine, /idempotency_key[\s\S]*duplicate: true/);
contains(
  "render jobs are tenant isolated by RLS",
  renderMigration,
  /enable row level security[\s\S]*company_id = current_company_id\(\)/,
);

contains(
  "current tenant helper requires an active profile",
  migration,
  /current_company_id\(\)[\s\S]*p\.is_active = true/,
);
contains("self-reactivation is blocked", migration, /SELF_ACTIVATION_CHANGE_FORBIDDEN/);
contains(
  "legacy roles are backfilled then tenant-bound",
  migration,
  /UPDATE public\.user_roles[\s\S]*guard_user_role_company/,
);
contains(
  "non-admin users cannot enumerate company roles",
  migration,
  /read company roles[\s\S]*user_id = auth\.uid\(\)[\s\S]*public\.is_company_admin\(\)/,
);
contains(
  "generated documents use per-kind authorization",
  migration,
  /generated read[\s\S]*can_access_document_kind\(kind, false\)/,
);
contains("reviewed document content is immutable", migration, /DOC_REVIEW_CONTENT_LOCKED/);
contains("document approvals require approver permissions", migration, /DOC_APPROVER_REQUIRED/);
contains("identity approval requires an administrator", migration, /IDENTITY_APPROVER_REQUIRED/);
contains(
  "approved identity is locked until an administrator returns it to draft",
  migration,
  /IDENTITY_APPROVAL_LOCKED/,
);
contains(
  "approved official records are immutable in-place",
  migration,
  /COMPANY_DOC_APPROVAL_LOCKED/,
);
contains(
  "template publication requires an administrator",
  migration,
  /TEMPLATE_PUBLISHER_REQUIRED/,
);
contains(
  "payment approval ceilings are enforced in SQL",
  migration,
  /NEW\.amount <= 250000[\s\S]*NEW\.amount <= 50000/,
);
contains(
  "finance detail reads are role-restricted",
  migration,
  /DROP POLICY IF EXISTS "ba_read"[\s\S]*general_manager','accountant/,
);
contains(
  "generic uploads exclude the HR folder",
  migration,
  /attachments_insert_own_company[\s\S]*<> 'hr'/,
);
contains(
  "AI admin-only setting is enforced in SQL",
  migration,
  /admin_kinds_only[\s\S]*NOT public\.is_company_admin/,
);
contains(
  "quotation customer tenancy is enforced",
  migration,
  /quotations_customer_company_fk[\s\S]*FOREIGN KEY \(company_id, customer_id\)/,
);
contains("WhatsApp unread increments atomically", migration, /unread_count = unread_count \+ 1/);

excludes("website webhook never buffers an unbounded request", website, /request\.text\(\)/);
contains(
  "website signature binds integration and company",
  website,
  /verifyIntegrationSignature[\s\S]*companyId: integration\.company_id/,
);
contains("website CAPTCHA is verified by the provider", website, /verifyWebsiteCaptcha/);
excludes("WhatsApp webhook never buffers an unbounded request", whatsapp, /request\.text\(\)/);
contains(
  "WhatsApp signature binds integration and company",
  whatsapp,
  /verifyIntegrationSignature[\s\S]*companyId: integration\.company_id/,
);
contains(
  "AI registration verifies storage metadata",
  ai,
  /storage\.from\(AI_BUCKET\)\.info\(data\.object_path\)/,
);
contains(
  "AI file rows can only be registered by the verified server path",
  migration,
  /REVOKE INSERT ON public\.ai_job_files FROM authenticated/,
);
contains(
  "AI execution uses an atomic compare-and-set claim",
  ai,
  /eq\("status", job\.status\)\.eq\("attempts", job\.attempts\)/,
);
excludes("official identity proposals contain no contact email", constants, /contact_email/);

console.log(`\n${passed} static security regression checks passed`);
