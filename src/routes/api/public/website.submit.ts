import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  company_id: z.string().uuid(),
  kind: z.enum(["contact", "quote_request", "measurement"]).default("contact"),
  idempotency_key: z.string().min(8).max(120),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(160).optional(),
  city: z.string().trim().max(60).optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().max(4000).optional(),
  details: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).default({}),
  source_url: z.string().trim().max(300).optional(),
  captcha_token: z.string().max(4000).optional(),
  files: z
    .array(
      z.object({
        storage_path: z.string().max(400),
        file_name: z.string().max(160),
        mime_type: z.string().max(100),
        size_bytes: z.number().int().min(0).max(25_000_000),
      }),
    )
    .max(10)
    .default([]),
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * Public intake endpoint for www.almuqrinfurniturefactory.com.
 * Signed with a tenant-bound HMAC, replay-guarded, rate limited,
 * idempotent, and captcha-ready. Never returns internal data.
 */
export const Route = createFileRoute("/api/public/website/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          verifyIntegrationSignature,
          verifyWebsiteCaptcha,
          readBoundedBody,
          RequestBodyTooLargeError,
          rateLimit,
          hashIp,
          sha256Hex,
          normalizePhone,
        } = await import("@/lib/integrations.server");

        const ip =
          request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        if (!rateLimit(`website:${ip ?? "unknown"}`, 20)) return json(429, { error: "rate_limited" });

        const integrationIdResult = z.string().uuid().safeParse(request.headers.get("x-almugren-integration-id"));
        if (!integrationIdResult.success) return json(401, { error: "missing_integration" });
        const integrationId = integrationIdResult.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integration } = await supabaseAdmin
          .from("integrations")
          .select("id, company_id, status, allowed_origins, rate_limit_per_min, config")
          .eq("id", integrationId)
          .eq("kind", "website")
          .maybeSingle();
        if (!integration || integration.status === "disconnected" || integration.status === "paused") {
          return json(403, { error: "integration_unavailable" });
        }
        if (!rateLimit(`website:integration:${integration.id}`, integration.rate_limit_per_min)) {
          return json(429, { error: "rate_limited" });
        }

        const origin = request.headers.get("origin");
        const allowed = integration.allowed_origins ?? [];
        if (allowed.length > 0 && origin && !allowed.includes(origin)) {
          return json(403, { error: "origin_not_allowed" });
        }

        let raw: string;
        try {
          raw = await readBoundedBody(request, 256 * 1024);
        } catch (error) {
          return json(error instanceof RequestBodyTooLargeError ? 413 : 400, {
            error: error instanceof RequestBodyTooLargeError ? "payload_too_large" : "invalid_payload",
          });
        }

        const check = verifyIntegrationSignature({
          kind: "website",
          companyId: integration.company_id,
          integrationId: integration.id,
          rawBody: raw,
          signature: request.headers.get("x-almugren-signature"),
          timestamp: request.headers.get("x-almugren-timestamp"),
        });
        if (!check.ok) return json(check.reason === "missing_secret" ? 503 : 401, { error: check.reason });

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return json(400, { error: "invalid_payload" });
        }
        if (parsed.company_id !== integration.company_id) return json(401, { error: "integration_company_mismatch" });

        const config = (integration.config as Record<string, unknown> | null) ?? {};
        const captchaRequired = Boolean(config["captcha_required"]);
        if (captchaRequired && !parsed.captcha_token) return json(400, { error: "captcha_required" });
        let captchaVerified = false;
        if (captchaRequired && parsed.captcha_token) {
          const domain = typeof config["domain"] === "string"
            ? config["domain"].replace(/^https?:\/\//i, "").split("/", 1)[0] ?? null
            : null;
          const captcha = await verifyWebsiteCaptcha({
            token: parsed.captcha_token,
            remoteIp: ip,
            expectedHostname: domain,
          });
          if (!captcha.ok) {
            return json(captcha.reason === "missing_secret" ? 503 : 400, { error: "captcha_verification_failed" });
          }
          captchaVerified = true;
        }

        // replay / duplicate guard on the raw envelope
        const digest = sha256Hex(raw);
        const { error: eventError } = await supabaseAdmin.from("webhook_events").insert({
          company_id: parsed.company_id,
          integration_id: integration.id,
          source: "website",
          provider_event_id: parsed.idempotency_key,
          event_type: parsed.kind,
          signature_valid: true,
          event_timestamp: new Date().toISOString(),
          payload_digest: digest,
        });
        if (eventError) {
          if (eventError.code === "23505") return json(200, { status: "duplicate_ignored" });
          return json(500, { error: "intake_failed" });
        }

        const { data: submission, error } = await supabaseAdmin
          .from("website_submissions")
          .insert({
            company_id: parsed.company_id,
            integration_id: integration.id,
            kind: parsed.kind,
            idempotency_key: parsed.idempotency_key,
            full_name: parsed.full_name,
            phone: parsed.phone ? normalizePhone(parsed.phone) : null,
            email: parsed.email ?? null,
            city: parsed.city ?? null,
            subject: parsed.subject ?? null,
            message: parsed.message ?? null,
            details: parsed.details,
            source_url: parsed.source_url ?? null,
            source_ip_hash: hashIp(ip),
            captcha_verified: captchaVerified,
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") return json(200, { status: "duplicate_ignored" });
          return json(500, { error: "intake_failed" });
        }

        if (parsed.files.length > 0) {
          await supabaseAdmin.from("website_submission_files").insert(
            parsed.files.map((f) => ({
              company_id: parsed.company_id,
              submission_id: submission.id,
              storage_path: f.storage_path,
              file_name: f.file_name,
              mime_type: f.mime_type,
              size_bytes: f.size_bytes,
            })),
          );
        }

        // durable outbox entry so the in-app notification can never be lost
        await supabaseAdmin.from("outbox_events").upsert(
          {
            company_id: parsed.company_id,
            topic: "website.submission.received",
            dedup_key: submission.id,
            payload: { submission_id: submission.id, kind: parsed.kind },
          },
          { onConflict: "company_id,topic,dedup_key", ignoreDuplicates: true },
        );

        await supabaseAdmin
          .from("webhook_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("company_id", parsed.company_id)
          .eq("source", "website")
          .eq("provider_event_id", parsed.idempotency_key);

        await supabaseAdmin
          .from("integrations")
          .update({ last_sync_at: new Date().toISOString(), health: "healthy", last_error: null })
          .eq("id", integration.id);

        return json(202, { status: "received" });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, x-almugren-integration-id, x-almugren-signature, x-almugren-timestamp",
          },
        }),
    },
  },
});
