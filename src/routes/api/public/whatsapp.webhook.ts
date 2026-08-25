import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/** Provider-agnostic normalized inbound envelope. Adapters map provider payloads to this shape. */
const eventSchema = z.object({
  company_id: z.string().uuid(),
  provider: z.string().max(40).default("generic"),
  event_id: z.string().min(4).max(160),
  event_type: z.enum(["message", "status"]),
  message: z
    .object({
      provider_message_id: z.string().min(1).max(160),
      from: z.string().min(6).max(30),
      contact_name: z.string().max(120).optional(),
      type: z.string().max(30).default("text"),
      body: z.string().max(4000).optional(),
      media: z
        .object({
          storage_path: z.string().max(400),
          mime_type: z.string().max(100),
          size_bytes: z.number().int().min(0).max(50_000_000),
        })
        .optional(),
    })
    .optional(),
  status: z
    .object({
      provider_message_id: z.string().min(1).max(160),
      state: z.enum(["sent", "delivered", "read", "failed"]),
      error: z.string().max(300).optional(),
    })
    .optional(),
});

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * WhatsApp Business inbound webhook.
 * Signature + timestamp verified, replay-guarded by provider event id,
 * idempotent on provider message id. Message bodies and full phone numbers
 * are never written to audit logs.
 */
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          verifyIntegrationSignature,
          readBoundedBody,
          RequestBodyTooLargeError,
          rateLimit,
          sha256Hex,
          normalizePhone,
        } = await import("@/lib/integrations.server");
        const { maskPhone } = await import("@/lib/integrations-constants");

        const ip = request.headers.get("cf-connecting-ip")
          ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          ?? "unknown";
        if (!rateLimit(`wa:ip:${ip}`, 120)) return json(429, { error: "rate_limited" });

        const integrationIdResult = z.string().uuid().safeParse(request.headers.get("x-almugren-integration-id"));
        if (!integrationIdResult.success) return json(401, { error: "missing_integration" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integration } = await supabaseAdmin
          .from("integrations")
          .select("id, company_id, status, rate_limit_per_min")
          .eq("id", integrationIdResult.data)
          .eq("kind", "whatsapp")
          .maybeSingle();
        if (!integration || integration.status === "disconnected" || integration.status === "paused") {
          return json(403, { error: "integration_unavailable" });
        }
        if (!rateLimit(`wa:integration:${integration.id}`, integration.rate_limit_per_min)) {
          return json(429, { error: "rate_limited" });
        }

        let raw: string;
        try {
          raw = await readBoundedBody(request, 512 * 1024);
        } catch (error) {
          return json(error instanceof RequestBodyTooLargeError ? 413 : 400, {
            error: error instanceof RequestBodyTooLargeError ? "payload_too_large" : "invalid_payload",
          });
        }

        const check = verifyIntegrationSignature({
          kind: "whatsapp",
          companyId: integration.company_id,
          integrationId: integration.id,
          rawBody: raw,
          signature: request.headers.get("x-almugren-signature"),
          timestamp: request.headers.get("x-almugren-timestamp"),
        });
        if (!check.ok) return json(check.reason === "missing_secret" ? 503 : 401, { error: check.reason });

        let evt: z.infer<typeof eventSchema>;
        try {
          evt = eventSchema.parse(JSON.parse(raw));
        } catch {
          return json(400, { error: "invalid_payload" });
        }
        if (evt.company_id !== integration.company_id) return json(401, { error: "integration_company_mismatch" });

        const { error: replayError } = await supabaseAdmin.from("webhook_events").insert({
          company_id: evt.company_id,
          integration_id: integration.id,
          source: "whatsapp",
          provider_event_id: evt.event_id,
          event_type: evt.event_type,
          signature_valid: true,
          event_timestamp: new Date().toISOString(),
          payload_digest: sha256Hex(raw),
        });
        if (replayError) {
          if (replayError.code === "23505") return json(200, { status: "duplicate_ignored" });
          return json(500, { error: "intake_failed" });
        }

        if (evt.event_type === "status" && evt.status) {
          await supabaseAdmin
            .from("wa_messages")
            .update({
              status: evt.status.state,
              status_updated_at: new Date().toISOString(),
              error_text: evt.status.error ?? null,
            })
            .eq("company_id", evt.company_id)
            .eq("provider_message_id", evt.status.provider_message_id);

          const { data: msg } = await supabaseAdmin
            .from("wa_messages")
            .select("id")
            .eq("company_id", evt.company_id)
            .eq("provider_message_id", evt.status.provider_message_id)
            .maybeSingle();
          if (msg) {
            await supabaseAdmin
              .from("document_sends")
              .update({ status: evt.status.state, error_text: evt.status.error ?? null })
              .eq("company_id", evt.company_id)
              .eq("wa_message_id", msg.id);
          }
        }

        if (evt.event_type === "message" && evt.message) {
          const phone = normalizePhone(evt.message.from);
          const { data: existing } = await supabaseAdmin
            .from("wa_conversations")
            .select("id")
            .eq("company_id", evt.company_id)
            .eq("contact_phone", phone)
            .maybeSingle();

          let conversationId = existing?.id ?? null;
          if (!conversationId) {
            const { data: created, error } = await supabaseAdmin
              .from("wa_conversations")
              .insert({
                company_id: evt.company_id,
                integration_id: integration.id,
                contact_phone: phone,
                contact_phone_masked: maskPhone(phone),
                contact_name: evt.message.contact_name ?? null,
                unread_count: 0,
              })
              .select("id")
              .single();
            if (error?.code === "23505") {
              const { data: raced } = await supabaseAdmin
                .from("wa_conversations")
                .select("id")
                .eq("company_id", evt.company_id)
                .eq("contact_phone", phone)
                .maybeSingle();
              conversationId = raced?.id ?? null;
            } else if (error) {
              return json(500, { error: "intake_failed" });
            } else {
              conversationId = created.id;
            }
            if (!conversationId) return json(500, { error: "intake_failed" });
          }

          const { error: msgError } = await supabaseAdmin.from("wa_messages").insert({
            company_id: evt.company_id,
            conversation_id: conversationId,
            direction: "inbound",
            provider_message_id: evt.message.provider_message_id,
            message_type: evt.message.type,
            body: evt.message.body ?? null,
            media_path: evt.message.media?.storage_path ?? null,
            media_mime: evt.message.media?.mime_type ?? null,
            media_size_bytes: evt.message.media?.size_bytes ?? null,
            status: "delivered",
            status_updated_at: new Date().toISOString(),
          });
          if (msgError && msgError.code !== "23505") return json(500, { error: "intake_failed" });

          if (!msgError) {
            const { error: unreadError } = await supabaseAdmin.rpc("increment_wa_unread", {
              _conversation_id: conversationId,
            });
            if (unreadError) return json(500, { error: "intake_failed" });

            await supabaseAdmin.from("outbox_events").upsert(
              {
                company_id: evt.company_id,
                topic: "whatsapp.message.received",
                dedup_key: evt.message.provider_message_id,
                payload: { conversation_id: conversationId },
              },
              { onConflict: "company_id,topic,dedup_key", ignoreDuplicates: true },
            );
          }
        }

        await supabaseAdmin
          .from("webhook_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("company_id", evt.company_id)
          .eq("source", "whatsapp")
          .eq("provider_event_id", evt.event_id);

        await supabaseAdmin
          .from("integrations")
          .update({ last_sync_at: new Date().toISOString(), health: "healthy", last_error: null })
          .eq("id", integration.id);

        return json(200, { status: "ok" });
      },
    },
  },
});
