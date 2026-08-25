const TARGET_SUPABASE_HOST = 'vmswbmkkgvnjhznxbsdz.supabase.co';
const TARGET_SUPABASE_URL = `https://${TARGET_SUPABASE_HOST}`;

// GitHub CI validates code without deployment secrets. Vercel builds must validate
// their runtime environment before a candidate can become deployable.
if (!process.env.VERCEL) {
  console.log('Deployment environment verification skipped outside Vercel.');
  process.exit(0);
}

const required = ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const optionalServer = [
  'BOOTSTRAP_TOKEN',
  'LOVABLE_API_KEY',
  'WEBSITE_WEBHOOK_SECRET',
  'WEBSITE_CAPTCHA_SECRET',
  'WHATSAPP_WEBHOOK_SECRET',
  'WHATSAPP_API_TOKEN',
  'EMAIL_API_KEY',
];

const missing = required.filter((name) => !process.env[name]);
const configuredOptional = optionalServer.filter((name) => Boolean(process.env[name]));
if (missing.length > 0) {
  console.error(`Missing required environment keys: ${missing.join(', ')}`);
  process.exit(1);
}

// A weak legacy bootstrap token does not block an already-initialized deployment.
// bootstrapFirstAdmin independently rejects missing/short tokens, so this remains fail-closed.
if (process.env.BOOTSTRAP_TOKEN && process.env.BOOTSTRAP_TOKEN.length < 32) {
  console.log('Legacy BOOTSTRAP_TOKEN is below 32 characters; first-admin bootstrap remains locked.');
}

function normalizeUrl(value) {
  return String(value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

function resolveConfiguredUrl(name) {
  const raw = normalizeUrl(process.env[name]);
  if (!raw) return TARGET_SUPABASE_URL;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' && parsed.hostname === TARGET_SUPABASE_HOST) return parsed.origin;
  } catch {
    // Runtime clients deliberately fall back to the approved project as well.
  }
  console.log(`${name} is malformed or points elsewhere; approved project fallback will be used.`);
  return TARGET_SUPABASE_URL;
}

const serverUrl = resolveConfiguredUrl('SUPABASE_URL');
const publicUrl = resolveConfiguredUrl('VITE_SUPABASE_URL');
if (serverUrl !== TARGET_SUPABASE_URL || publicUrl !== TARGET_SUPABASE_URL) {
  console.error('Resolved Supabase URLs do not match the approved Almuqrin project.');
  process.exit(1);
}

const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function assertHttpOk(label, url, key) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        apikey: key,
        accept: 'application/json',
      },
    });
  } catch {
    console.error(`${label} validation could not reach the approved Supabase project.`);
    process.exit(1);
  }
  if (!response.ok) {
    console.error(`${label} is not valid for the approved Supabase project (HTTP ${response.status}).`);
    process.exit(1);
  }
}

// Public-key validation proves the browser-facing key belongs to this project.
await assertHttpOk('Supabase publishable key', `${TARGET_SUPABASE_URL}/auth/v1/settings`, publishableKey);

// Admin endpoint validation proves the server credential has service-level authority
// for this exact project. A publishable/anon key cannot pass this check.
await assertHttpOk(
  'Supabase service role key',
  `${TARGET_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`,
  serviceRoleKey,
);

console.log(`Environment verified for approved Supabase target: ${TARGET_SUPABASE_HOST}.`);
console.log(`Browser publishable key source: ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'VITE' : 'server public fallback'}.`);
console.log(`Optional integrations configured: ${configuredOptional.length}/${optionalServer.length}.`);
