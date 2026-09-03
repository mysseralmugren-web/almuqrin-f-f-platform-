import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);
const BASELINE = "20260903030000";
const REVIEW_MARKER = /--\s*security-definer:\s*reviewed\b/i;
const AUTH_RPC_MARKER = /--\s*security-definer-authenticated-rpc:\s*intentional\b/i;

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql") && name.slice(0, 14) >= BASELINE)
  .sort();

let reviewed = 0;
for (const file of files) {
  const sql = readFileSync(join(migrationsDir.pathname, file), "utf8");
  const chunks = sql.split(/(?=create\s+(?:or\s+replace\s+)?function\s+)/gi);

  for (const chunk of chunks) {
    if (!/security\s+definer/i.test(chunk)) continue;

    const header = chunk.match(/create\s+(?:or\s+replace\s+)?function\s+([^\n]+?\))/i)?.[1] ?? file;
    assert.match(chunk, REVIEW_MARKER, `${file}: ${header} must include -- security-definer: reviewed`);
    assert.match(chunk, /set\s+search_path\s+to\s+/i, `${file}: ${header} must pin search_path`);
    assert.doesNotMatch(chunk, /grant\s+execute[\s\S]{0,300}\bto\s+public\b/i, `${file}: ${header} must never grant EXECUTE to PUBLIC`);

    if (/grant\s+execute[\s\S]{0,300}\bto\s+authenticated\b/i.test(chunk)) {
      assert.match(
        chunk,
        AUTH_RPC_MARKER,
        `${file}: ${header} grants authenticated EXECUTE and must include -- security-definer-authenticated-rpc: intentional`,
      );
      assert.match(
        chunk,
        /auth\.uid\s*\(|current_company_id\s*\(|has_any_role\s*\(|is_company_admin\s*\(|user_can_module\s*\(|store_manager_authorized\s*\(/i,
        `${file}: ${header} authenticated RPC must contain or call an authorization guard`,
      );
    }

    reviewed += 1;
  }
}

console.log(`PASS  SECURITY DEFINER governance checked ${reviewed} post-baseline function(s) across ${files.length} migration file(s)`);
