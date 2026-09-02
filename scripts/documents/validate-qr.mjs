import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (ok, msg) => { if (!ok) throw new Error(msg); };

const layout = read("src/routes/_authenticated.tsx");
const verifyApi = read("src/routes/api/public/document.verify.ts");
const verifyPage = read("src/routes/verify.document.tsx");
const qrFn = read("src/lib/document-qr.functions.ts");
const qrServer = read("src/lib/document-qr.server.ts");
const zatca = read("src/lib/zatca.ts");
const migration = read("supabase/migrations/20260902233000_document_qr_settings.sql");

const tests = [
  ["01 global print routes include verification QR", () => must(layout.includes("PrintVerificationQr") && layout.includes('startsWith("/print/")'), "PRINT_QR_NOT_GLOBAL")],
  ["02 generated document viewer is covered", () => must(layout.includes("isGeneratedDocument") && layout.includes("PrintVerificationQr pathname={location.pathname}"), "GENERATED_DOCUMENT_QR_MISSING")],
  ["03 public verification endpoint exists", () => must(verifyApi.includes("verifyVerificationToken") && verifyApi.includes("cache-control"), "PUBLIC_VERIFY_ENDPOINT_MISSING")],
  ["04 public verification page exists", () => must(verifyPage.includes("التحقق من صحة المستند") && verifyPage.includes("/api/public/document/verify"), "PUBLIC_VERIFY_PAGE_MISSING")],
  ["05 QR payload uses HMAC server-only", () => must(qrServer.includes("createHmac") && qrServer.includes("timingSafeEqual") && !qrFn.includes('from "node:crypto"'), "QR_SIGNING_NOT_SERVER_ONLY")],
  ["06 tenant settings default enabled", () => must(migration.includes("enabled boolean not null default true") && migration.includes("company_id uuid primary key"), "QR_SETTINGS_DEFAULT_INVALID")],
  ["07 QR settings are tenant isolated", () => must(migration.includes("enable row level security") && migration.includes("document_qr_settings_select_company"), "QR_RLS_MISSING")],
  ["08 ZATCA QR remains independent", () => must(zatca.includes("tlv(1") && zatca.includes("tlv(2") && zatca.includes("tlv(3") && zatca.includes("tlv(4") && zatca.includes("tlv(5"), "ZATCA_QR_FIELDS_MISSING")],
  ["09 tax invoice internal QR preference exists", () => must(qrFn.includes("show_internal_on_tax_invoice") && qrFn.includes('generated?.kind === "tax_invoice"'), "TAX_QR_PREFERENCE_MISSING")],
];

for (const [name, run] of tests) { run(); console.log(`✓ ${name}`); }
console.log(`Document QR acceptance: ${tests.length}/${tests.length} passed`);
