import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  INTEGRATION_KINDS,
  PRIORITIES,
  SLA_MINUTES,
  maskPhone,
  type IntegrationKind,
  type Priority,
} from "@/lib/integrations-constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

const MEDIA_BUCKET = "mfg-attachments";
const ADMIN = ["super_admin", "factory_owner", "general_manager"];
const COMMS = [...ADMIN, "sales_manager", "sales_employee", "project_manager"];
const uuid = z.string().uuid();

function ok(res: any): any {
  if (res?.error) throw new Error(res.error.message);
  return res?.data;
}

async function companyOf(c: Ctx): Promise<string> {
  const data = ok(await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle());
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function rolesOf(c: Ctx): Promise<string[]> {
  const rows = ok(await c.supabase.from("user_roles").select("role").eq("user_id", c.userId)) as Array<{ role: string }>;
  return (rows ?? []).map((r) => r.role);
}

const isAdmin = (roles: string[]) => roles.some((r) => ADMIN.includes(r));
const isComms = (roles: string[]) => roles.some((r) => COMMS.includes(r));

async function requireComms(c: Ctx) {
  const roles = await rolesOf(c);
  if (!isComms(roles)) throw new Error("FORBIDDEN");
  return roles;
}

async function requireAdmin(c: Ctx) {
  const roles = await rolesOf(c);
  if (!isAdmin(roles)) throw new Error("FORBIDDEN");
  return roles;
}

function slaFrom(priority: Priority, from = new Date()): string {
  return new Date(from.getTime() + SLA_MINUTES[priority] * 60_000).toISOString();
}

// ------------------------------------------------------------------ overview

export const getIntegrationsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const roles = await requireComms(c);
    const company_id = await companyOf(c);
    const { missingSecrets } = await import("@/lib/integrations.server");

    const rows = ok(
      await c.supabase.from("integrations").select("*").eq("company_id", company_id).order("kind"),
    ) as any[];

    const integrations = INTEGRATION_KINDS.map((kind) => {
      const row = (rows ?? []).find((r) => r.kind === kind) ?? null;
      const missing = missingSecrets(kind);
      return {
        kind,
        row: row
          ? {
              id: row.id,
              kind: row.kind,
              provider: row.provider,
              display_name: row.display_name,
              status: row.status,
              health: row.health,
              scopes: row.scopes,
              config: row.config,
              allowed_origins: row.allowed_origins,
              webhook_verified_at: row.webhook_verified_at,
              last_sync_at: row.last_sync_at,
              last_error: row.last_error,
              rate_limit_per_min: row.rate_limit_per_min,
            }
          : null,
        // names only — values are never returned
        missing_secrets: missing,
        secrets_ready: missing.length === 0,
        webhook_tested: Boolean(row?.webhook_verified_at),
        // an integration only claims "connected" once secrets exist AND a webhook was verified
        connected: Boolean(row && row.status === "active" && row.webhook_verified_at && missing.length === 0),
      };
    });

    const counters = {
      new_submissions: ok(
        await c.supabase
          .from("website_submissions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company_id)
          .in("status", ["new", "triage"]),
      ),
      dead_letters: (ok(
        await c.supabase.from("outbox_events").select("id").eq("company_id", company_id).eq("status", "dead"),
      ) as any[] | null)?.length ?? 0,
    };

    return { company_id, roles, is_admin: isAdmin(roles), integrations, counters };
  });

const saveIntegrationSchema = z.object({
  kind: z.enum(INTEGRATION_KINDS),
  provider: z.string().min(2).max(40),
  display_name: z.string().max(80).nullish(),
  scopes: z.array(z.string().max(60)).max(30).default([]),
  allowed_origins: z.array(z.string().max(200)).max(10).default([]),
  rate_limit_per_min: z.number().int().min(1).max(600).default(60),
  config: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean()])).default({}),
});

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveIntegrationSchema.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const { missingSecrets } = await import("@/lib/integrations.server");

    // Reject anything that looks like a secret being pushed from the browser.
    for (const [key, value] of Object.entries(data.config)) {
      if (/secret|token|password|api[_-]?key/i.test(key)) throw new Error("SECRETS_NOT_ALLOWED_IN_CONFIG");
      if (typeof value === "string" && value.length > 300) throw new Error("CONFIG_VALUE_TOO_LONG");
    }

    const missing = missingSecrets(data.kind);
    const row = ok(
      await c.supabase
        .from("integrations")
        .upsert(
          {
            company_id,
            kind: data.kind,
            provider: data.provider,
            display_name: data.display_name ?? null,
            scopes: data.scopes,
            allowed_origins: data.allowed_origins,
            rate_limit_per_min: data.rate_limit_per_min,
            config: data.config,
            secret_refs: (await import("@/lib/integrations-constants")).REQUIRED_SECRETS[data.kind],
            // never jump straight to "active": that needs secrets + a verified webhook
            status: missing.length === 0 ? "configured" : "disconnected",
            created_by: c.userId,
          },
          { onConflict: "company_id,kind,provider" },
        )
        .select("id, kind, status")
        .single(),
    );
    return { id: row.id, status: row.status, missing_secrets: missing };
  });

export const setIntegrationState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, action: z.enum(["pause", "resume"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const current = ok(
      await c.supabase.from("integrations").select("*").eq("id", data.id).eq("company_id", company_id).maybeSingle(),
    );
    if (!current) throw new Error("NOT_FOUND");
    const { missingSecrets } = await import("@/lib/integrations.server");
    if (data.action === "resume" && (missingSecrets(current.kind as IntegrationKind).length > 0 || !current.webhook_verified_at)) {
      throw new Error("SETUP_INCOMPLETE");
    }
    ok(
      await c.supabase
        .from("integrations")
        .update({ status: data.action === "pause" ? "paused" : "active" })
        .eq("id", data.id)
        .eq("company_id", company_id),
    );
    return { ok: true };
  });

/**
 * Records the result of a webhook self-test. No external call is made here:
 * the endpoint verifies its own signing configuration locally.
 */
export const testIntegrationWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const row = ok(
      await c.supabase.from("integrations").select("*").eq("id", data.id).eq("company_id", company_id).maybeSingle(),
    );
    if (!row) throw new Error("NOT_FOUND");

    const { missingSecrets, createIntegrationSignature, verifyIntegrationSignature } = await import("@/lib/integrations.server");
    const missing = missingSecrets(row.kind as IntegrationKind);
    if (missing.length > 0) {
      ok(
        await c.supabase
          .from("integrations")
          .update({ status: "disconnected", health: "down", last_error: `MISSING_SECRETS:${missing.join(",")}` })
          .eq("id", row.id),
      );
      return { ok: false, missing_secrets: missing };
    }

    if (row.kind !== "website" && row.kind !== "whatsapp") {
      throw new Error("WEBHOOK_NOT_SUPPORTED_FOR_INTEGRATION");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = "{}";
    const signature = createIntegrationSignature({
      kind: row.kind,
      companyId: company_id,
      integrationId: row.id,
      rawBody,
      timestamp,
    });
    const probe = verifyIntegrationSignature({
      kind: row.kind,
      companyId: company_id,
      integrationId: row.id,
      rawBody,
      signature,
      timestamp: String(timestamp),
    });
    const healthy = probe.ok;
    ok(
      await c.supabase
        .from("integrations")
        .update({
          status: healthy ? "active" : "error",
          health: healthy ? "healthy" : "down",
          webhook_verified_at: healthy ? new Date().toISOString() : null,
          last_error: healthy ? null : "WEBHOOK_GUARD_NOT_ACTIVE",
        })
        .eq("id", row.id),
    );
    return { ok: healthy, missing_secrets: [] as string[] };
  });

// ------------------------------------------------------------------ website submissions

export const listSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z.enum(["new", "triage", "converted", "rejected", "spam"]).optional(),
        search: z.string().max(80).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    let q = c.supabase
      .from("website_submissions")
      .select("*")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) q = q.or(`full_name.ilike.%${term}%,subject.ilike.%${term}%,city.ilike.%${term}%`);
    }
    const rows = (ok(await q) as any[]) ?? [];
    const files = rows.length
      ? ((ok(
          await c.supabase
            .from("website_submission_files")
            .select("*")
            .in("submission_id", rows.map((r) => r.id)),
        ) as any[]) ?? [])
      : [];
    return rows.map((r) => ({
      ...r,
      phone: r.phone ? maskPhone(r.phone) : null,
      files: files.filter((f) => f.submission_id === r.id),
    }));
  });

export const triageSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["triage", "rejected", "spam"]).optional(),
        priority: z.enum(PRIORITIES).optional(),
        tags: z.array(z.string().max(30)).max(10).optional(),
        assign_to_me: z.boolean().optional(),
        mark_read: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    const patch: Record<string, unknown> = { reviewed_by: c.userId, reviewed_at: new Date().toISOString() };
    if (data.status) patch.status = data.status;
    if (data.priority) {
      patch.priority = data.priority;
      patch.sla_due_at = slaFrom(data.priority);
    }
    if (data.tags) patch.tags = data.tags;
    if (data.assign_to_me) patch.assigned_to = c.userId;
    if (data.mark_read) patch.unread = false;
    ok(await c.supabase.from("website_submissions").update(patch).eq("id", data.id).eq("company_id", company_id));
    return { ok: true };
  });

/** Human-reviewed conversion: submission -> customer (+ optional draft quotation), exactly once. */
export const convertSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        customer_id: uuid.optional(),
        customer_name_ar: z.string().min(2).max(160).optional(),
        create_quotation: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);

    const sub = ok(
      await c.supabase.from("website_submissions").select("*").eq("id", data.id).eq("company_id", company_id).maybeSingle(),
    );
    if (!sub) throw new Error("NOT_FOUND");
    if (sub.status === "converted") throw new Error("ALREADY_CONVERTED");

    let customer_id = data.customer_id ?? null;
    if (customer_id) {
      const existing = ok(
        await c.supabase.from("customers").select("id").eq("id", customer_id).eq("company_id", company_id).maybeSingle(),
      );
      if (!existing) throw new Error("CUSTOMER_NOT_IN_COMPANY");
    } else {
      const created = ok(
        await c.supabase
          .from("customers")
          .insert({
            company_id,
            name_ar: data.customer_name_ar ?? sub.full_name,
            phone: sub.phone,
            email: sub.email,
            city: sub.city,
            segment: "website",
            notes: `مصدر: الموقع الإلكتروني — ${sub.kind}`,
            created_by: c.userId,
          })
          .select("id")
          .single(),
      );
      customer_id = created.id;
    }

    let quotation_id: string | null = null;
    if (data.create_quotation) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: num, error: numErr } = await supabaseAdmin.rpc("next_document_number", {
        _company_id: company_id,
        _doc_type: "quotation",
        _prefix: "QT",
      });
      if (numErr) throw new Error(numErr.message);
      const quote = ok(
        await c.supabase
          .from("quotations")
          .insert({
            company_id,
            customer_id,
            quote_number: num,
            status: "draft",
            notes: `طلب من الموقع الإلكتروني — ${sub.subject ?? sub.kind}`,
            created_by: c.userId,
          })
          .select("id")
          .single(),
      );
      quotation_id = quote.id;
    }

    ok(
      await c.supabase
        .from("website_submissions")
        .update({
          status: "converted",
          converted_customer_id: customer_id,
          converted_quotation_id: quotation_id,
          converted_at: new Date().toISOString(),
          reviewed_by: c.userId,
          reviewed_at: new Date().toISOString(),
          unread: false,
        })
        .eq("id", data.id)
        .eq("company_id", company_id)
        .eq("status", sub.status),
    );

    return { customer_id, quotation_id };
  });

// ------------------------------------------------------------------ whatsapp inbox

export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ search: z.string().max(80).optional(), only_mine: z.boolean().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    let q = c.supabase
      .from("wa_conversations")
      .select("*")
      .eq("company_id", company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data.only_mine) q = q.eq("assigned_to", c.userId);
    if (data.search) {
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) q = q.or(`contact_name.ilike.%${term}%,contact_phone_masked.ilike.%${term}%`);
    }
    const rows = (ok(await q) as any[]) ?? [];
    // never leak the full phone number to the browser
    return rows.map(({ contact_phone: _p, ...rest }) => rest);
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    const conv = ok(
      await c.supabase.from("wa_conversations").select("*").eq("id", data.id).eq("company_id", company_id).maybeSingle(),
    );
    if (!conv) throw new Error("NOT_FOUND");
    const messages = (ok(
      await c.supabase
        .from("wa_messages")
        .select("*")
        .eq("conversation_id", data.id)
        .eq("company_id", company_id)
        .order("created_at"),
    ) as any[]) ?? [];
    ok(await c.supabase.from("wa_conversations").update({ unread_count: 0 }).eq("id", data.id).eq("company_id", company_id));
    const { contact_phone: _p, ...safeConv } = conv;
    return { conversation: safeConv, messages };
  });

export const updateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        priority: z.enum(PRIORITIES).optional(),
        tags: z.array(z.string().max(30)).max(10).optional(),
        assign_to_me: z.boolean().optional(),
        status: z.enum(["open", "pending", "closed"]).optional(),
        customer_id: uuid.nullish(),
        project_id: uuid.nullish(),
        quotation_id: uuid.nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);

    // IDOR guard: every linked entity must belong to the caller's company.
    for (const [table, id] of [
      ["customers", data.customer_id],
      ["projects", data.project_id],
      ["quotations", data.quotation_id],
    ] as const) {
      if (!id) continue;
      const row = ok(await c.supabase.from(table).select("id").eq("id", id).eq("company_id", company_id).maybeSingle());
      if (!row) throw new Error("CROSS_TENANT_LINK");
    }

    const patch: Record<string, unknown> = {};
    if (data.priority) {
      patch.priority = data.priority;
      patch.sla_due_at = slaFrom(data.priority);
    }
    if (data.tags) patch.tags = data.tags;
    if (data.assign_to_me) patch.assigned_to = c.userId;
    if (data.status) patch.status = data.status;
    if (data.customer_id !== undefined) patch.customer_id = data.customer_id;
    if (data.project_id !== undefined) patch.project_id = data.project_id;
    if (data.quotation_id !== undefined) patch.quotation_id = data.quotation_id;
    ok(await c.supabase.from("wa_conversations").update(patch).eq("id", data.id).eq("company_id", company_id));
    return { ok: true };
  });

/** Short-lived signed URL for private inbound media. */
export const getMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ message_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    const msg = ok(
      await c.supabase
        .from("wa_messages")
        .select("media_path")
        .eq("id", data.message_id)
        .eq("company_id", company_id)
        .maybeSingle(),
    );
    if (!msg?.media_path) throw new Error("NOT_FOUND");
    const { data: signed, error } = await c.supabase.storage.from(MEDIA_BUCKET).createSignedUrl(msg.media_path, 120);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, expires_in: 120 };
  });

// ------------------------------------------------------------------ templates

export const listWaTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    return (
      (ok(
        await c.supabase.from("wa_templates").select("*").eq("company_id", company_id).order("name").order("version"),
      ) as any[]) ?? []
    );
  });

export const saveWaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
        language: z.string().min(2).max(5).default("ar"),
        category: z.string().max(30).default("utility"),
        body: z.string().min(5).max(1024),
        variables: z.array(z.string().max(40)).max(10).default([]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const existing = (ok(
      await c.supabase.from("wa_templates").select("version").eq("company_id", company_id).eq("name", data.name),
    ) as any[]) ?? [];
    const version = existing.reduce((m, r) => Math.max(m, r.version as number), 0) + 1;
    const row = ok(
      await c.supabase.from("wa_templates").insert({ ...data, company_id, version, status: "draft" }).select("id, version").single(),
    );
    return row;
  });

export const approveWaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    ok(
      await c.supabase
        .from("wa_templates")
        .update({ status: "approved", approved_by: c.userId, approved_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("company_id", company_id)
        .eq("status", "draft"),
    );
    return { ok: true };
  });

// ------------------------------------------------------------------ approved document sending

/** Recipients allowed for a document: only phones on the linked customer record. */
export const getSendOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ generated_document_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    const doc = ok(
      await c.supabase
        .from("generated_documents")
        .select("*")
        .eq("id", data.generated_document_id)
        .eq("company_id", company_id)
        .maybeSingle(),
    );
    if (!doc) throw new Error("NOT_FOUND");

    const customer = doc.customer_id
      ? ok(await c.supabase.from("customers").select("id, name_ar, phone").eq("id", doc.customer_id).eq("company_id", company_id).maybeSingle())
      : null;

    const recipients = customer?.phone
      ? [{ customer_id: customer.id, label: customer.name_ar as string, masked: maskPhone(customer.phone as string) }]
      : [];

    return {
      document: { id: doc.id, kind: doc.kind, status: doc.status, document_number: doc.document_number },
      sendable: doc.status === "approved" || doc.status === "issued",
      recipients,
      sends:
        (ok(
          await c.supabase
            .from("document_sends")
            .select("*")
            .eq("generated_document_id", doc.id)
            .eq("company_id", company_id)
            .order("created_at", { ascending: false }),
        ) as any[]) ?? [],
    };
  });

/**
 * Queues an approved document for WhatsApp delivery through the outbox.
 * Nothing is sent from here — a server-side worker drains the outbox.
 */
export const queueDocumentSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ generated_document_id: uuid, customer_id: uuid, confirm: z.literal(true) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);

    const doc = ok(
      await c.supabase
        .from("generated_documents")
        .select("id, status, kind, document_number, customer_id")
        .eq("id", data.generated_document_id)
        .eq("company_id", company_id)
        .maybeSingle(),
    );
    if (!doc) throw new Error("NOT_FOUND");
    if (doc.status !== "approved" && doc.status !== "issued") throw new Error("DOCUMENT_NOT_APPROVED");
    if (doc.customer_id && doc.customer_id !== data.customer_id) throw new Error("RECIPIENT_NOT_AUTHORIZED");

    const customer = ok(
      await c.supabase.from("customers").select("id, name_ar, phone").eq("id", data.customer_id).eq("company_id", company_id).maybeSingle(),
    );
    if (!customer?.phone) throw new Error("RECIPIENT_HAS_NO_PHONE");

    const integration = ok(
      await c.supabase.from("integrations").select("*").eq("company_id", company_id).eq("kind", "whatsapp").maybeSingle(),
    );
    if (!integration || integration.status !== "active") throw new Error("WHATSAPP_NOT_CONNECTED");

    const { normalizePhone } = await import("@/lib/integrations.server");
    const phone = normalizePhone(customer.phone as string);

    let conversation = ok(
      await c.supabase.from("wa_conversations").select("id").eq("company_id", company_id).eq("contact_phone", phone).maybeSingle(),
    );
    if (!conversation) {
      conversation = ok(
        await c.supabase
          .from("wa_conversations")
          .insert({
            company_id,
            integration_id: integration.id,
            contact_phone: phone,
            contact_phone_masked: maskPhone(phone),
            contact_name: customer.name_ar,
            customer_id: customer.id,
          })
          .select("id")
          .single(),
      );
    }

    const send = ok(
      await c.supabase
        .from("document_sends")
        .insert({
          company_id,
          generated_document_id: doc.id,
          channel: "whatsapp",
          conversation_id: conversation.id,
          customer_id: customer.id,
          recipient_masked: maskPhone(phone),
          recipient_label: customer.name_ar,
          approved_by: c.userId,
        })
        .select("id")
        .single(),
    );

    // transactional outbox — the only path that may talk to the provider
    ok(
      await c.supabase.from("outbox_events").upsert(
        {
          company_id,
          topic: "whatsapp.document.send",
          dedup_key: `${doc.id}:${customer.id}:${send.id}`,
          payload: { document_send_id: send.id, conversation_id: conversation.id, generated_document_id: doc.id },
        },
        { onConflict: "company_id,topic,dedup_key", ignoreDuplicates: true },
      ),
    );

    return { document_send_id: send.id, conversation_id: conversation.id, status: "pending" as const };
  });

// ------------------------------------------------------------------ unified inbox

export const getUnifiedInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ search: z.string().max(80).optional(), only_unread: z.boolean().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireComms(c);
    const company_id = await companyOf(c);
    const term = (data.search ?? "").replace(/[%,()]/g, " ").trim();

    let subQ = c.supabase
      .from("website_submissions")
      .select("id, kind, full_name, subject, status, priority, tags, assigned_to, sla_due_at, unread, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.only_unread) subQ = subQ.eq("unread", true);
    if (term) subQ = subQ.or(`full_name.ilike.%${term}%,subject.ilike.%${term}%`);

    let convQ = c.supabase
      .from("wa_conversations")
      .select("id, contact_name, contact_phone_masked, status, priority, tags, assigned_to, sla_due_at, unread_count, last_message_at, created_at")
      .eq("company_id", company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (data.only_unread) convQ = convQ.gt("unread_count", 0);
    if (term) convQ = convQ.or(`contact_name.ilike.%${term}%,contact_phone_masked.ilike.%${term}%`);

    let notifQ = c.supabase
      .from("notifications")
      .select("id, topic, title, body, priority, status, link_path, read_at, created_at")
      .eq("user_id", c.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.only_unread) notifQ = notifQ.is("read_at", null);
    if (term) notifQ = notifQ.ilike("title", `%${term}%`);

    const [subs, convs, notifs] = await Promise.all([subQ, convQ, notifQ]);

    const items = [
      ...(((ok(subs) as any[]) ?? []).map((r) => ({
        source: "website" as const,
        id: r.id,
        title: r.full_name,
        preview: r.subject ?? r.kind,
        status: r.status,
        priority: r.priority,
        tags: r.tags,
        assigned_to: r.assigned_to,
        sla_due_at: r.sla_due_at,
        unread: r.unread,
        at: r.created_at,
      }))),
      ...(((ok(convs) as any[]) ?? []).map((r) => ({
        source: "whatsapp" as const,
        id: r.id,
        title: r.contact_name ?? r.contact_phone_masked,
        preview: r.contact_phone_masked,
        status: r.status,
        priority: r.priority,
        tags: r.tags,
        assigned_to: r.assigned_to,
        sla_due_at: r.sla_due_at,
        unread: r.unread_count > 0,
        at: r.last_message_at ?? r.created_at,
      }))),
      ...(((ok(notifs) as any[]) ?? []).map((r) => ({
        source: "notification" as const,
        id: r.id,
        title: r.title,
        preview: r.body ?? r.topic,
        status: r.status,
        priority: r.priority,
        tags: [] as string[],
        assigned_to: null,
        sla_due_at: null,
        unread: !r.read_at,
        at: r.created_at,
      }))),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));

    return items;
  });

// ------------------------------------------------------------------ notifications

export const getNotificationCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const roles = await rolesOf(c);
    const [notifications, prefs, templates] = await Promise.all([
      c.supabase.from("notifications").select("*").eq("user_id", c.userId).order("created_at", { ascending: false }).limit(100),
      c.supabase.from("notification_preferences").select("*").eq("user_id", c.userId).maybeSingle(),
      c.supabase.from("notification_templates").select("*").eq("company_id", company_id).order("key").order("version"),
    ]);
    const outbox = isAdmin(roles)
      ? ((ok(
          await c.supabase.from("outbox_events").select("*").eq("company_id", company_id).order("created_at", { ascending: false }).limit(100),
        ) as any[]) ?? [])
      : [];
    return {
      notifications: (ok(notifications) as any[]) ?? [],
      preferences: ok(prefs),
      templates: (ok(templates) as any[]) ?? [],
      outbox,
      is_admin: isAdmin(roles),
    };
  });

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        in_app_enabled: z.boolean(),
        email_enabled: z.boolean(),
        whatsapp_enabled: z.boolean(),
        muted_topics: z.array(z.string().max(60)).max(40).default([]),
        quiet_hours_start: z.number().int().min(0).max(23).nullish(),
        quiet_hours_end: z.number().int().min(0).max(23).nullish(),
        timezone: z.string().max(40).default("Asia/Riyadh"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    ok(
      await c.supabase
        .from("notification_preferences")
        .upsert({ ...data, user_id: c.userId, company_id }, { onConflict: "user_id" }),
    );
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    ok(
      await c.supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", c.userId),
    );
    return { ok: true };
  });

export const saveNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        key: z.string().min(2).max(60).regex(/^[a-z0-9_.]+$/),
        channel: z.enum(["in_app", "email", "whatsapp"]),
        title_ar: z.string().min(2).max(160),
        body_ar: z.string().min(2).max(2000),
        title_en: z.string().max(160).nullish(),
        body_en: z.string().max(2000).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const existing = (ok(
      await c.supabase
        .from("notification_templates")
        .select("version")
        .eq("company_id", company_id)
        .eq("key", data.key)
        .eq("channel", data.channel),
    ) as any[]) ?? [];
    const version = existing.reduce((m, r) => Math.max(m, r.version as number), 0) + 1;
    ok(await c.supabase.from("notification_templates").insert({ ...data, company_id, version }));
    return { version };
  });

/** Requeue a dead-lettered outbox event after the underlying issue was fixed. */
export const requeueOutboxEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = ok(
      await c.supabase.from("outbox_events").select("id, status").eq("id", data.id).eq("company_id", company_id).maybeSingle(),
    );
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "dead" && row.status !== "failed") throw new Error("NOT_RETRYABLE");
    const { error } = await supabaseAdmin
      .from("outbox_events")
      .update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
      .eq("id", data.id)
      .eq("company_id", company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
