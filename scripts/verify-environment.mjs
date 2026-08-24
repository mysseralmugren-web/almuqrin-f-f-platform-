const requiredPublic = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
const requiredServer = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BOOTSTRAP_TOKEN',
];

const optionalServer = [
  'LOVABLE_API_KEY',
  'WEBSITE_WEBHOOK_SECRET',
  'WEBSITE_CAPTCHA_SECRET',
  'WHATSAPP_WEBHOOK_SECRET',
  'WHATSAPP_API_TOKEN',
  'EMAIL_API_KEY',
];

const missing = [...requiredPublic, ...requiredServer].filter((name) => !process.env[name]);
const configuredOptional = optionalServer.filter((name) => Boolean(process.env[name]));

if (process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  const serverUrl = new URL(process.env.SUPABASE_URL).origin;
  const publicUrl = new URL(process.env.VITE_SUPABASE_URL).origin;
  if (serverUrl !== publicUrl) {
    console.error('Supabase public and server URLs point to different projects.');
    process.exit(1);
  }
}

if (process.env.BOOTSTRAP_TOKEN && process.env.BOOTSTRAP_TOKEN.length < 32) {
  console.error('BOOTSTRAP_TOKEN must contain at least 32 characters.');
  process.exit(1);
}

if (missing.length > 0) {
  console.error(`Missing required environment keys: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Environment verified: ${requiredPublic.length + requiredServer.length} required keys present.`);
console.log(`Optional integrations configured: ${configuredOptional.length}/${optionalServer.length}.`);
