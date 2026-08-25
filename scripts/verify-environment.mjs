const TARGET_SUPABASE_HOST = 'vmswbmkkgvnjhznxbsdz.supabase.co';

// GitHub CI validates code without deployment secrets. Vercel builds must validate
// their runtime environment before a candidate can become deployable.
if (!process.env.VERCEL) {
  console.log('Deployment environment verification skipped outside Vercel.');
  process.exit(0);
}

const required = [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

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

// VITE_SUPABASE_PUBLISHABLE_KEY is optional because the browser client already uses
// the same public project key as a compile-time fallback. If supplied, it must be non-empty.
const effectivePublicKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!effectivePublicKey) {
  console.error('No Supabase publishable key is available for the browser client.');
  process.exit(1);
}

let serverUrl;
let publicUrl;
try {
  serverUrl = new URL(process.env.SUPABASE_URL);
  publicUrl = new URL(process.env.VITE_SUPABASE_URL);
} catch {
  console.error('Supabase URL configuration is invalid.');
  process.exit(1);
}

if (serverUrl.origin !== publicUrl.origin) {
  console.error('Supabase public and server URLs point to different projects.');
  process.exit(1);
}

if (serverUrl.hostname !== TARGET_SUPABASE_HOST || publicUrl.hostname !== TARGET_SUPABASE_HOST) {
  console.error('Deployment is not configured for the approved Almuqrin company_id Supabase project.');
  process.exit(1);
}

if (process.env.BOOTSTRAP_TOKEN && process.env.BOOTSTRAP_TOKEN.length < 32) {
  console.error('BOOTSTRAP_TOKEN must contain at least 32 characters when configured.');
  process.exit(1);
}

console.log(`Environment verified: ${required.length} required keys present.`);
console.log(`Supabase target verified: ${TARGET_SUPABASE_HOST}.`);
console.log(`Browser publishable key source: ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'VITE' : 'server public fallback'}.`);
console.log(`Optional integrations configured: ${configuredOptional.length}/${optionalServer.length}.`);
