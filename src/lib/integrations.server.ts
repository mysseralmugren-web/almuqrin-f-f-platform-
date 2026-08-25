/**
 * Module 11 — server-only helpers for integrations.
 * Secrets are read from server env exclusively and are never returned to callers or logged.
 */
import { createHmac, timingSafeEqual, createHash, randomUUID } from "crypto";
import { REQUIRED_SECRETS, type IntegrationKind } from "@/lib/integrations-constants";

/** True when the secret exists in the server environment. Value is never exposed. */
export function hasSecret(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

/** Which required secrets are still missing for an integration kind. */
export function missingSecrets(kind: IntegrationKind): string[] {
  return REQUIRED_SECRETS[kind].filter((n) => !hasSecret(n));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash an IP before storage — we never persist raw client IPs. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env["WEBSITE_WEBHOOK_SECRET"] ?? "almugren";
  return sha256Hex(`${salt}:${ip}`).slice(0, 32);
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface SignatureCheck {
  ok: boolean;
  reason?: "missing_secret" | "missing_signature" | "bad_signature" | "stale_timestamp";
}

function webhookSecretName(kind: "website" | "whatsapp"): string {
  return kind === "website" ? "WEBSITE_WEBHOOK_SECRET" : "WHATSAPP_WEBHOOK_SECRET";
}

function integrationKey(opts: {
  kind: "website" | "whatsapp";
  companyId: string;
  integrationId: string;
}): Buffer | null {
  const master = process.env[webhookSecretName(opts.kind)];
  if (!master) return null;
  return createHmac("sha256", master)
    .update(`almugren-webhook-v1:${opts.kind}:${opts.companyId}:${opts.integrationId}`)
    .digest();
}

function signaturePayload(opts: {
  seconds: number;
  kind: "website" | "whatsapp";
  companyId: string;
  integrationId: string;
  rawBody: string;
}): string {
  return `${opts.seconds}.${opts.kind}.${opts.companyId}.${opts.integrationId}.${opts.rawBody}`;
}

/** Creates a tenant-bound signature for trusted outbound adapters and self-tests. */
export function createIntegrationSignature(opts: {
  kind: "website" | "whatsapp";
  companyId: string;
  integrationId: string;
  rawBody: string;
  timestamp: number;
}): string {
  const key = integrationKey(opts);
  if (!key) throw new Error("WEBHOOK_SECRET_NOT_CONFIGURED");
  const seconds = opts.timestamp > 1e12 ? Math.floor(opts.timestamp / 1000) : Math.floor(opts.timestamp);
  const digest = createHmac("sha256", key)
    .update(signaturePayload({ ...opts, seconds }))
    .digest("hex");
  return `sha256=${digest}`;
}

/** Verify a replay-limited signature bound to one tenant and integration row. */
export function verifyIntegrationSignature(opts: {
  kind: "website" | "whatsapp";
  companyId: string;
  integrationId: string;
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  toleranceSeconds?: number;
}): SignatureCheck {
  const key = integrationKey(opts);
  if (!key) return { ok: false, reason: "missing_secret" };
  if (!opts.signature || !opts.timestamp) return { ok: false, reason: "missing_signature" };

  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "stale_timestamp" };
  const seconds = ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
  const skew = Math.abs(Math.floor(Date.now() / 1000) - seconds);
  if (skew > (opts.toleranceSeconds ?? 300)) return { ok: false, reason: "stale_timestamp" };

  const provided = opts.signature.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", key)
    .update(signaturePayload({ ...opts, seconds }))
    .digest("hex");
  return safeEqualHex(provided, expected) ? { ok: true } : { ok: false, reason: "bad_signature" };
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("REQUEST_BODY_TOO_LARGE");
  }
}

/** Stream through a strict byte cap before allocating the complete request. */
export async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyTooLargeError();
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

export async function verifyWebsiteCaptcha(opts: {
  token: string;
  remoteIp?: string | null;
  expectedHostname?: string | null;
}): Promise<{ ok: boolean; reason?: "missing_secret" | "verification_failed" }> {
  const secret = process.env["WEBSITE_CAPTCHA_SECRET"];
  if (!secret) return { ok: false, reason: "missing_secret" };
  const body = new URLSearchParams({ secret, response: opts.token });
  if (opts.remoteIp) body.set("remoteip", opts.remoteIp);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "verification_failed" };
    const result = (await response.json()) as { success?: boolean; hostname?: string };
    const expected = opts.expectedHostname?.trim().toLowerCase();
    if (!result.success || (expected && result.hostname?.toLowerCase() !== expected)) {
      return { ok: false, reason: "verification_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "verification_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

/** Fixed-window in-memory rate limiter (per worker instance, best-effort front line). */
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limitPerMinute) return false;
  bucket.count += 1;
  return true;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  return `+${digits}`;
}

export function newIdempotencyKey(): string {
  return randomUUID();
}

/** Redact free text before it can reach any audit log. */
export function redact(_value: string | null | undefined): string {
  return "[redacted]";
}
