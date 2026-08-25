import assert from "node:assert/strict";
import { createServer } from "vite";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS  ${name}`);
}

process.env.WEBSITE_WEBHOOK_SECRET = "unit-test-master-secret-not-for-production";
process.env.WHATSAPP_WEBHOOK_SECRET = "unit-test-whatsapp-secret-not-for-production";

const vite = await createServer({
  appType: "custom",
  server: { middlewareMode: true },
  logLevel: "silent",
});

try {
  const csv = await vite.ssrLoadModule("/src/lib/csv.ts");
  const auth = await vite.ssrLoadModule("/src/lib/auth-identifier.ts");
  const webhook = await vite.ssrLoadModule("/src/lib/integrations.server.ts");

  check("CSV formulas are neutralized after optional whitespace", () => {
    for (const value of ["=1+1", "+SUM(A1:A2)", "-10+20", "@cmd", "  =HYPERLINK(\"x\")", "\t@x"])
      assert.equal(csv.neutralizeCsvFormula(value).startsWith("'"), true, value);
    assert.equal(csv.neutralizeCsvFormula("ordinary text"), "ordinary text");
  });

  check("CSV output quotes headers, values and embedded quotes", () => {
    assert.equal(
      csv.recordsToCsv([{ name: 'a"b', amount: "=2+2" }]),
      '"name","amount"\r\n"a""b","\'=2+2"',
    );
  });

  check("username maps to a non-contact internal auth principal", () => {
    assert.equal(auth.identifierToAuthEmail(" Almuqrin_Admin "), "almuqrin_admin@auth.almugren.local");
    assert.equal(auth.authEmailToIdentifier("almuqrin_admin@auth.almugren.local"), "almuqrin_admin");
    assert.equal(auth.authEmailToIdentifier("contact@example.com"), "");
    assert.throws(() => auth.identifierToAuthEmail("contact@example.com"), /INVALID_USERNAME/);
    assert.throws(() => auth.identifierToAuthEmail("bad username"), /INVALID_USERNAME/);
  });

  check("email and Saudi mobile identifiers are normalized for sign-in", () => {
    assert.deepEqual(auth.parseManagerContactIdentifier(" Manager@Example.com "), { kind: "email", value: "manager@example.com" });
    assert.deepEqual(auth.parseManagerContactIdentifier("0551234567"), { kind: "phone", value: "+966551234567" });
    assert.throws(() => auth.parseManagerContactIdentifier("almuqrin_admin"), /INVALID_EMAIL_OR_PHONE/);
  });

  const base = {
    kind: "website",
    companyId: "11111111-1111-1111-1111-111111111111",
    integrationId: "22222222-2222-2222-2222-222222222222",
    rawBody: '{"ok":true}',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = webhook.createIntegrationSignature(base);

  check("valid integration-bound webhook signature succeeds", () => {
    assert.equal(webhook.verifyIntegrationSignature({ ...base, signature, timestamp: String(base.timestamp) }).ok, true);
  });

  check("signature cannot be replayed for another tenant", () => {
    const result = webhook.verifyIntegrationSignature({
      ...base,
      companyId: "33333333-3333-3333-3333-333333333333",
      signature,
      timestamp: String(base.timestamp),
    });
    assert.deepEqual(result, { ok: false, reason: "bad_signature" });
  });

  check("signature cannot be replayed for another integration", () => {
    const result = webhook.verifyIntegrationSignature({
      ...base,
      integrationId: "44444444-4444-4444-4444-444444444444",
      signature,
      timestamp: String(base.timestamp),
    });
    assert.deepEqual(result, { ok: false, reason: "bad_signature" });
  });

  check("stale signature is refused", () => {
    const timestamp = base.timestamp - 301;
    const staleSignature = webhook.createIntegrationSignature({ ...base, timestamp });
    assert.deepEqual(
      webhook.verifyIntegrationSignature({ ...base, signature: staleSignature, timestamp: String(timestamp) }),
      { ok: false, reason: "stale_timestamp" },
    );
  });

  check("bounded body accepts a small request", async () => {
    const body = await webhook.readBoundedBody(new Request("https://example.invalid", { method: "POST", body: "hello" }), 5);
    assert.equal(body, "hello");
  });

  check("bounded body rejects declared oversize before reading", async () => {
    const request = new Request("https://example.invalid", {
      method: "POST",
      headers: { "content-length": "100" },
      body: "x",
    });
    await assert.rejects(() => webhook.readBoundedBody(request, 10), /REQUEST_BODY_TOO_LARGE/);
  });

  check("bounded body rejects streamed oversize content", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("1234"));
        controller.enqueue(new TextEncoder().encode("5678"));
        controller.close();
      },
    });
    const request = new Request("https://example.invalid", { method: "POST", body: stream, duplex: "half" });
    await assert.rejects(() => webhook.readBoundedBody(request, 7), /REQUEST_BODY_TOO_LARGE/);
  });

  console.log(`\n${passed} unit regression checks passed`);
} finally {
  await vite.close();
}
