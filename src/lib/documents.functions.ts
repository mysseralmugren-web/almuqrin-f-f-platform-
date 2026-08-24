import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildZatcaQr } from "@/lib/zatca";
import {
  DOC_FILE_MAX_MB, DOC_FILE_MIME, DOC_KINDS, DOC_KIND_PREFIX, FACTORY_TERMS_AR,
  IDENTITY_PROPOSALS, DOC_KIND_LABEL, round2, type DocKind,
} from "@/lib/documents-constants";

type Ctx = { supabase: any; userId: string };

export const DOC_BUCKET = "mfg-attachments";

const ADMIN = ["super_admin", "factory_owner", "general_manager"];
const uuid = z.string().uuid();
const kindSchema = z.enum(DOC_KINDS);

/** Roles allowed to build/approve/issue each document kind (admins always allowed). */
const KIND_ROLES: Record<DocKind, string[]> = {
  quotation: ["sales_manager", "sales_employee"],
  sales_order: ["sales_manager", "sales_employee"],
  supply_contract: ["sales_manager"],
  tax_invoice: ["accountant"],
  receipt_voucher: ["accountant"],
  payment_voucher: ["accountant"],
  manufacturing_order: ["production_manager"],
  goods_receipt: ["warehouse_manager", "purchasing_manager"],
  delivery_note: ["warehouse_manager", "project_manager", "sales_manager"],
  measurement_report: ["project_manager", "designer"],
  design_approval: ["project_manager", "designer"],
  final_handover: ["project_manager"],
  employee_contract: ["hr"],
};

/** Approval (approve/issue/void) requires a manager-level role on top of kind access. */
const APPROVER_ROLES: Record<DocKind, string[]> = {
  quotation: ["sales_manager"],
  sales_order: ["sales_manager"],
  supply_contract: ["sales_manager"],
  tax_invoice: ["accountant"],
  receipt_voucher: ["accountant"],
  payment_voucher: ["accountant"],
  manufacturing_order: ["production_manager"],
  goods_receipt: ["warehouse_manager", "purchasing_manager"],
  delivery_note: ["warehouse_manager", "project_manager"],
  measurement_report: ["project_manager"],
  design_approval: ["project_manager"],
  final_handover: ["project_manager"],
  employee_contract: ["hr"],
};

interface SourceCfg {
  table: string;
  items?: [string, string];
  party?: [string, string];
  numberFields: string[];
}

const SOURCES: Record<DocKind, SourceCfg> = {
  quotation: { table: "quotations", items: ["quotation_items", "quotation_id"], party: ["customers", "customer_id"], numberFields: ["quote_number"] },
  sales_order: { table: "sales_orders", items: ["sales_order_items", "sales_order_id"], party: ["customers", "customer_id"], numberFields: ["order_number"] },
  supply_contract: { table: "sales_orders", items: ["sales_order_items", "sales_order_id"], party: ["customers", "customer_id"], numberFields: ["order_number"] },
  tax_invoice: { table: "invoices", items: ["invoice_items", "invoice_id"], party: ["customers", "customer_id"], numberFields: ["invoice_number"] },
  receipt_voucher: { table: "cash_vouchers", party: ["customers", "customer_id"], numberFields: ["voucher_number"] },
  payment_voucher: { table: "cash_vouchers", party: ["suppliers", "supplier_id"], numberFields: ["voucher_number"] },
  manufacturing_order: { table: "manufacturing_orders", numberFields: ["mo_number"] },
  goods_receipt: { table: "goods_receipts", items: ["goods_receipt_items", "goods_receipt_id"], party: ["suppliers", "supplier_id"], numberFields: ["grn_number"] },
  delivery_note: { table: "delivery_notes", items: ["delivery_note_items", "delivery_note_id"], party: ["customers", "customer_id"], numberFields: ["dn_number"] },
  measurement_report: { table: "site_surveys", items: ["site_measurements", "site_survey_id"], numberFields: ["survey_number", "reference"] },
  design_approval: { table: "material_approvals", numberFields: ["reference"] },
  final_handover: { table: "handover_records", numberFields: ["handover_number"] },
  employee_contract: { table: "employee_contracts", party: ["employees", "employee_id"], numberFields: ["contract_number"] },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
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

async function requireKind(c: Ctx, kind: DocKind, approver = false) {
  const roles = await rolesOf(c);
  if (isAdmin(roles)) return roles;
  const allow = approver ? APPROVER_ROLES[kind] : KIND_ROLES[kind];
  if (!roles.some((r) => allow.includes(r))) throw new Error("FORBIDDEN_KIND");
  return roles;
}

async function requireIdentityAdmin(c: Ctx) {
  const roles = await rolesOf(c);
  if (!isAdmin(roles) && !roles.includes("accountant")) throw new Error("FORBIDDEN");
  return roles;
}

async function identityOf(c: Ctx, company_id: string) {
  return ok(await c.supabase.from("company_identity").select("*").eq("company_id", company_id).maybeSingle());
}

function companyComplete(company: any, identity: any) {
  return (
    /^[0-9]{15}$/.test(company?.vat_number ?? "") &&
    /^[0-9]{5}$/.test(company?.address_postal_code ?? "") &&
    Boolean(company?.address_building_no && company?.address_street && company?.address_district && company?.address_city) &&
    identity?.status === "approved"
  );
}

// ---------------------------------------------------------------- access

export const getDocumentsAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const roles = await rolesOf(c);
    const company = ok(await c.supabase.from("companies").select("*").eq("id", company_id).maybeSingle());
    const identity = await identityOf(c, company_id);
    const kinds = DOC_KINDS.filter((k) => isAdmin(roles) || roles.some((r) => KIND_ROLES[k].includes(r)));
    const approve = DOC_KINDS.filter((k) => isAdmin(roles) || roles.some((r) => APPROVER_ROLES[k].includes(r)));
    return {
      company_id,
      roles,
      company,
      identity,
      kinds,
      approve_kinds: approve,
      can_manage_identity: isAdmin(roles) || roles.includes("accountant"),
      invoice_ready: companyComplete(company, identity),
    };
  });

// ---------------------------------------------------------------- identity

const identitySchema = z.object({
  legal_name_ar: z.string().max(160).nullish(),
  legal_name_en: z.string().max(160).nullish(),
  trade_name_ar: z.string().max(160).nullish(),
  trade_name_en: z.string().max(160).nullish(),
  logo_path: z.string().max(400).nullish(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font_family: z.string().max(60).optional(),
  watermark_enabled: z.boolean().optional(),
  watermark_text: z.string().max(80).nullish(),
  watermark_opacity: z.number().min(0).max(0.5).optional(),
  website: z.string().max(160).nullish(),
  contact_email: z.string().max(160).nullish(),
  contact_phone: z.string().max(40).nullish(),
  short_address: z.string().max(20).nullish(),
  vat_effective_date: z.string().nullish(),
  footer_note_ar: z.string().max(400).nullish(),
  default_terms_ar: z.string().max(4000).nullish(),
  address_proof_expires_on: z.string().nullish(),
  address_proof_verified: z.boolean().optional(),
});

export const getCompanyIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const company = ok(await c.supabase.from("companies").select("*").eq("id", company_id).maybeSingle());
    const identity = await identityOf(c, company_id);
    const proposals = ok(
      await c.supabase.from("company_identity_proposals").select("*").eq("company_id", company_id).order("created_at"),
    );
    return { company, identity, proposals: proposals ?? [], invoice_ready: companyComplete(company, identity) };
  });

export const saveCompanyIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => identitySchema.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    const payload = { ...data, company_id, status: "draft" as const, reviewed_by: null, reviewed_at: null };
    const row = ok(
      await c.supabase.from("company_identity").upsert(payload, { onConflict: "company_id" }).select("*").single(),
    );
    return row;
  });

export const setIdentityStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ status: z.enum(["draft", "review", "approved"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireIdentityAdmin(c);
    if (data.status === "approved" && !isAdmin(roles)) throw new Error("FORBIDDEN");
    const company_id = await companyOf(c);
    return ok(
      await c.supabase
        .from("company_identity")
        .update({
          status: data.status,
          reviewed_by: data.status === "approved" ? c.userId : null,
          reviewed_at: data.status === "approved" ? new Date().toISOString() : null,
        })
        .eq("company_id", company_id)
        .select("*")
        .single(),
    );
  });

/** Loads the known identity values as PENDING proposals. Nothing is applied automatically. */
export const loadIdentityProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    const rows = IDENTITY_PROPOSALS.map((p) => ({
      company_id,
      field_key: p.field_key,
      proposed_value: p.value,
      source_note: "مُدخل من المستخدم — يتطلب اعتمادًا بشريًا",
      status: "pending",
    }));
    ok(await c.supabase.from("company_identity_proposals").upsert(rows, { onConflict: "company_id,field_key,status" }).select("id"));
    return { count: rows.length };
  });

const COMPANY_FIELDS = new Set([
  "cr_number", "vat_number", "address_city", "address_district", "address_street",
  "address_postal_code", "address_building_no", "address_additional_no", "phone", "email",
]);

export const decideIdentityProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, approve: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireIdentityAdmin(c);
    if (!isAdmin(roles)) throw new Error("FORBIDDEN");
    const company_id = await companyOf(c);
    const p = ok(await c.supabase.from("company_identity_proposals").select("*").eq("id", data.id).maybeSingle());
    if (!p) throw new Error("DOC_NOT_FOUND");
    if (p.status !== "pending") throw new Error("PROPOSAL_NOT_PENDING");

    if (data.approve) {
      if (COMPANY_FIELDS.has(p.field_key)) {
        ok(await c.supabase.from("companies").update({ [p.field_key]: p.proposed_value }).eq("id", company_id).select("id"));
      } else {
        ok(
          await c.supabase
            .from("company_identity")
            .upsert(
              {
                company_id,
                [p.field_key]: p.proposed_value,
                status: "draft",
                reviewed_by: null,
                reviewed_at: null,
              },
              { onConflict: "company_id" },
            )
            .select("id"),
        );
      }
    }
    ok(
      await c.supabase
        .from("company_identity_proposals")
        .update({ status: data.approve ? "approved" : "rejected", decided_by: c.userId, decided_at: new Date().toISOString() })
        .eq("id", p.id)
        .eq("status", "pending")
        .select("id"),
    );
    return { applied: data.approve };
  });

// ---------------------------------------------------------------- company official documents

export const listCompanyDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const docs = ok(
      await c.supabase.from("company_documents").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    );
    const files = ok(await c.supabase.from("document_files").select("*").is("deleted_at", null));
    return (docs ?? []).map((d: any) => ({ ...d, files: (files ?? []).filter((f: any) => f.company_document_id === d.id) }));
  });

export const saveCompanyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        doc_type: z.enum(["cr", "vat_certificate", "address_proof", "chamber", "license", "bank_letter", "other"]),
        title: z.string().trim().min(2).max(160),
        reference_no: z.string().max(60).nullish(),
        issued_on: z.string().nullish(),
        expires_on: z.string().nullish(),
        notes: z.string().max(500).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    if (id) return ok(await c.supabase.from("company_documents").update(rest).eq("id", id).select("*").single());
    return ok(
      await c.supabase
        .from("company_documents")
        .insert({ ...rest, company_id, created_by: c.userId, status: "draft" })
        .select("*")
        .single(),
    );
  });

export const setCompanyDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, status: z.enum(["draft", "review", "approved", "rejected", "expired"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireIdentityAdmin(c);
    if (["approved", "rejected"].includes(data.status) && !isAdmin(roles)) throw new Error("FORBIDDEN");
    const finalDecision = ["approved", "rejected"].includes(data.status);
    return ok(
      await c.supabase
        .from("company_documents")
        .update({
          status: data.status,
          reviewed_by: finalDecision ? c.userId : null,
          reviewed_at: finalDecision ? new Date().toISOString() : null,
        })
        .eq("id", data.id)
        .select("*")
        .single(),
    );
  });

const safeName = (n: string) => n.replace(/[^\w.\-\u0600-\u06FF]/g, "_").slice(-80);

export const createCompanyDocUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        company_document_id: uuid,
        file_name: z.string().trim().min(1).max(160),
        content_type: z.string().max(120),
        size_bytes: z.number().int().positive(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    if (!(DOC_FILE_MIME as readonly string[]).includes(data.content_type)) throw new Error("FILE_TYPE_NOT_ALLOWED");
    if (data.size_bytes > DOC_FILE_MAX_MB * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    const doc = ok(
      await c.supabase.from("company_documents").select("id").eq("id", data.company_document_id).maybeSingle(),
    );
    if (!doc) throw new Error("DOC_NOT_FOUND");
    const path = `${company_id}/company_document/${data.company_document_id}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const signed = ok(await c.supabase.storage.from(DOC_BUCKET).createSignedUploadUrl(path));
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const registerCompanyDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        company_document_id: uuid,
        object_path: z.string().min(1).max(400),
        file_name: z.string().min(1).max(160),
        content_type: z.string().max(120),
        size_bytes: z.number().int().nonnegative(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    const expectedPrefix = `${company_id}/company_document/${data.company_document_id}/`;
    if (!data.object_path.startsWith(expectedPrefix)) throw new Error("PATH_OUTSIDE_COMPANY");
    if (!(DOC_FILE_MIME as readonly string[]).includes(data.content_type)) throw new Error("FILE_TYPE_NOT_ALLOWED");
    const actual = ok(await c.supabase.storage.from(DOC_BUCKET).info(data.object_path));
    const actualSize = Number(actual?.size);
    const actualType = String(actual?.contentType ?? "").split(";", 1)[0]!.trim().toLowerCase();
    if (!Number.isSafeInteger(actualSize) || actualSize <= 0 || actualSize !== data.size_bytes) {
      throw new Error("FILE_SIZE_MISMATCH");
    }
    if (actualSize > DOC_FILE_MAX_MB * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    if (actualType !== data.content_type.toLowerCase()) throw new Error("FILE_TYPE_MISMATCH");
    return ok(
      await c.supabase
        .from("document_files")
        .insert({ ...data, size_bytes: actualSize, content_type: actualType, company_id, uploaded_by: c.userId })
        .select("id")
        .single(),
    );
  });

export const getCompanyDocFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ file_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const f = ok(
      await c.supabase.from("document_files").select("object_path").eq("id", data.file_id).is("deleted_at", null).maybeSingle(),
    );
    if (!f) throw new Error("DOC_NOT_FOUND");
    const signed = ok(await c.supabase.storage.from(DOC_BUCKET).createSignedUrl(f.object_path, 300));
    return { url: signed.signedUrl, expires_in: 300 };
  });

export const deleteCompanyDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ file_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireIdentityAdmin(c);
    if (!isAdmin(roles)) throw new Error("FORBIDDEN");
    ok(
      await c.supabase.from("document_files").update({ deleted_at: new Date().toISOString() }).eq("id", data.file_id).select("id"),
    );
    return { ok: true };
  });

// ---------------------------------------------------------------- templates

export const listTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const templates = ok(
      await c.supabase.from("document_templates").select("*").is("deleted_at", null).order("kind"),
    );
    const versions = ok(await c.supabase.from("template_versions").select("*").order("version", { ascending: false }));
    return (templates ?? []).map((t: any) => ({
      ...t,
      versions: (versions ?? []).filter((v: any) => v.template_id === t.id),
    }));
  });

/** Creates the 13 standard Arabic RTL templates once (no pre-filled item rows). */
export const ensureDefaultTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const company_id = await companyOf(c);
    const existing = ok(await c.supabase.from("document_templates").select("kind,code"));
    const have = new Set((existing ?? []).map((t: any) => t.code));
    let created = 0;
    for (const kind of DOC_KINDS) {
      const code = `TPL-${DOC_KIND_PREFIX[kind]}`;
      if (have.has(code)) continue;
      const tpl = ok(
        await c.supabase
          .from("document_templates")
          .insert({
            company_id, kind, code,
            name_ar: DOC_KIND_LABEL[kind].ar,
            name_en: DOC_KIND_LABEL[kind].en,
            created_by: c.userId,
          })
          .select("id")
          .single(),
      );
      ok(
        await c.supabase
          .from("template_versions")
          .insert({
            company_id, template_id: tpl.id, version: 1,
            layout: { direction: "rtl", page: "A4", accent: "#1E3A5F", secondary: "#C0C0C0", show_page_numbers: true },
            terms_ar: FACTORY_TERMS_AR,
            created_by: c.userId,
          })
          .select("id")
          .single(),
      );
      created += 1;
    }
    return { created };
  });

export const saveTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        version_id: uuid,
        terms_ar: z.string().max(8000).nullish(),
        footer_ar: z.string().max(600).nullish(),
        watermark_text: z.string().max(80).nullish(),
        show_qr: z.boolean().optional(),
        show_logo: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const { version_id, ...rest } = data;
    return ok(await c.supabase.from("template_versions").update(rest).eq("id", version_id).select("*").single());
  });

export const publishTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ version_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireIdentityAdmin(c);
    if (!isAdmin(roles)) throw new Error("FORBIDDEN");
    return ok(
      await c.supabase
        .from("template_versions")
        .update({ is_published: true, published_by: c.userId })
        .eq("id", data.version_id)
        .select("*")
        .single(),
    );
  });

/** Copies a published version into a new editable draft version. */
export const cloneTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ version_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireIdentityAdmin(c);
    const src = ok(await c.supabase.from("template_versions").select("*").eq("id", data.version_id).maybeSingle());
    if (!src) throw new Error("DOC_NOT_FOUND");
    const rows = ok(
      await c.supabase.from("template_versions").select("version").eq("template_id", src.template_id).order("version", { ascending: false }).limit(1),
    );
    const next = ((rows?.[0]?.version as number) ?? 0) + 1;
    return ok(
      await c.supabase
        .from("template_versions")
        .insert({
          company_id: src.company_id, template_id: src.template_id, version: next,
          layout: src.layout, terms_ar: src.terms_ar, footer_ar: src.footer_ar,
          watermark_text: src.watermark_text, show_qr: src.show_qr, show_logo: src.show_logo,
          created_by: c.userId,
        })
        .select("*")
        .single(),
    );
  });

// ---------------------------------------------------------------- generated documents

async function loadSource(c: Ctx, kind: DocKind, entity_id: string) {
  const cfg = SOURCES[kind];
  const record = ok(await c.supabase.from(cfg.table).select("*").eq("id", entity_id).maybeSingle());
  if (!record) throw new Error("SOURCE_NOT_FOUND");
  let items: any[] = [];
  if (cfg.items) {
    items = ok(await c.supabase.from(cfg.items[0]).select("*").eq(cfg.items[1], entity_id).order("created_at")) ?? [];
  }
  let party: any = null;
  if (cfg.party && record[cfg.party[1]]) {
    party = ok(await c.supabase.from(cfg.party[0]).select("*").eq("id", record[cfg.party[1]]).maybeSingle());
  }
  return { cfg, record, items, party };
}

function partyView(kind: DocKind, party: any) {
  if (!party) return null;
  if (SOURCES[kind].party?.[0] === "employees") {
    return { name: party.full_name_ar, secondary: party.employee_number, city: party.city, phone: party.phone };
  }
  return {
    name: party.name_ar,
    name_en: party.name_en,
    vat_number: party.vat_number,
    cr_number: party.cr_number,
    city: party.city,
    phone: party.phone,
    address: party.address,
  };
}

function totalsFor(kind: DocKind, record: any, items: any[]) {
  if (!items.length) {
    const amount = Number(record.amount ?? record.total ?? 0);
    return { subtotal: round2(amount), discount_total: 0, vat_amount: round2(Number(record.vat_amount ?? 0)), total: round2(Number(record.total ?? amount)) };
  }
  const subtotal = round2(items.reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0), 0));
  const discount_total = round2(items.reduce((s, i) => s + Number(i.discount_amount ?? 0), 0));
  const vat_amount = round2(items.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0));
  const total = round2(
    items.reduce((s, i) => s + Number(i.line_total ?? 0), 0) || subtotal - discount_total + vat_amount,
  );
  return { subtotal, discount_total, vat_amount, total };
}

/** Builds a DRAFT document snapshot from a live record. Never issues by itself. */
export const buildDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: kindSchema, entity_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const kind = data.kind as DocKind;
    await requireKind(c, kind);
    const company_id = await companyOf(c);
    const company = ok(await c.supabase.from("companies").select("*").eq("id", company_id).maybeSingle());
    const identity = await identityOf(c, company_id);

    if (kind === "tax_invoice" && !companyComplete(company, identity)) throw new Error("COMPANY_DATA_INCOMPLETE");

    const { cfg, record, items, party } = await loadSource(c, kind, data.entity_id);
    const totals = totalsFor(kind, record, items);

    const tpl = ok(
      await c.supabase.from("document_templates").select("*").eq("kind", kind).is("deleted_at", null).limit(1).maybeSingle(),
    );
    let version: any = null;
    if (tpl) {
      const vs = ok(
        await c.supabase.from("template_versions").select("*").eq("template_id", tpl.id).order("version", { ascending: false }),
      );
      version = (vs ?? []).find((v: any) => v.is_published) ?? (vs ?? [])[0] ?? null;
    }

    const sourceNumber = cfg.numberFields.map((f) => record[f]).find(Boolean) ?? null;

    const snapshot: Record<string, unknown> = {
      kind,
      source_number: sourceNumber,
      source_date: record.issue_date ?? record.order_date ?? record.voucher_date ?? record.delivery_date ?? record.receipt_date ?? record.start_date ?? record.handover_date ?? null,
      company: {
        legal_name_ar: identity?.legal_name_ar ?? company?.name_ar ?? null,
        trade_name_ar: identity?.trade_name_ar ?? company?.name_ar ?? null,
        name_en: identity?.trade_name_en ?? company?.name_en ?? null,
        vat_number: company?.vat_number ?? null,
        cr_number: company?.cr_number ?? null,
        address: {
          building_no: company?.address_building_no ?? null,
          street: company?.address_street ?? null,
          district: company?.address_district ?? null,
          city: company?.address_city ?? null,
          postal_code: company?.address_postal_code ?? null,
          additional_no: company?.address_additional_no ?? null,
          short_address: identity?.short_address ?? null,
        },
        phone: identity?.contact_phone ?? company?.phone ?? null,
        email: identity?.contact_email ?? company?.email ?? null,
        website: identity?.website ?? null,
        logo_path: identity?.logo_path ?? "/brand/almugren-furniture-logo.jpeg",
      },
      brand: {
        primary: identity?.primary_color ?? "#1E3A5F",
        secondary: identity?.secondary_color ?? "#C0C0C0",
        font_family: identity?.font_family ?? "Cairo",
        watermark_enabled: identity?.watermark_enabled ?? true,
        watermark_text: version?.watermark_text ?? identity?.watermark_text ?? identity?.trade_name_ar ?? company?.name_ar ?? null,
        watermark_opacity: Number(identity?.watermark_opacity ?? 0.07),
      },
      party: partyView(kind, party),
      record,
      items,
      totals,
      terms_ar: version?.terms_ar ?? FACTORY_TERMS_AR,
      footer_ar: version?.footer_ar ?? identity?.footer_note_ar ?? null,
      show_qr: version?.show_qr ?? true,
      show_logo: version?.show_logo ?? true,
      vat_rate: 0.15,
      tax_treatment: record.tax_treatment ?? "standard",
      price_mode: "exclusive",
      zatca: { phase: 1, phase2_integration: Boolean(identity?.zatca_phase2_enabled), cryptographic_stamp: false },
      generated_at: new Date().toISOString(),
    };

    let qr_payload: string | null = null;
    if (kind === "tax_invoice") {
      qr_payload = buildZatcaQr({
        sellerName: (identity?.legal_name_ar ?? company?.name_ar ?? "") as string,
        vatNumber: (company?.vat_number ?? "") as string,
        timestamp: new Date(record.issued_at ?? record.issue_date ?? Date.now()).toISOString(),
        total: totals.total,
        vatAmount: totals.vat_amount,
      });
    }

    const row = ok(
      await c.supabase
        .from("generated_documents")
        .insert({
          company_id, kind, entity: cfg.table, entity_id: data.entity_id,
          template_id: tpl?.id ?? null, template_version: version?.version ?? null,
          snapshot, qr_payload, created_by: c.userId,
        })
        .select("*")
        .single(),
    );
    return row;
  });

export const listGeneratedDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ kind: kindSchema.optional(), status: z.enum(["draft", "review", "approved", "issued", "void"]).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("generated_documents")
      .select("id,kind,entity,entity_id,doc_number,status,revision,issued_at,created_at,template_version,snapshot")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.status) q = q.eq("status", data.status);
    const rows = ok(await q);
    return (rows ?? []).map((r: any) => ({
      ...r,
      party_name: r.snapshot?.party?.name ?? null,
      source_number: r.snapshot?.source_number ?? null,
      total: r.snapshot?.totals?.total ?? null,
      snapshot: undefined,
    }));
  });

export const getGeneratedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const doc = ok(await c.supabase.from("generated_documents").select("*").eq("id", data.id).is("deleted_at", null).maybeSingle());
    if (!doc) throw new Error("DOC_NOT_FOUND");
    const approvals = ok(
      await c.supabase.from("document_approvals").select("*").eq("generated_document_id", doc.id).order("created_at"),
    );
    const deliveries = ok(
      await c.supabase.from("document_delivery_logs").select("*").eq("generated_document_id", doc.id).order("created_at", { ascending: false }),
    );
    const roles = await rolesOf(c);
    const kind = doc.kind as DocKind;
    return {
      doc,
      approvals: approvals ?? [],
      deliveries: deliveries ?? [],
      can_edit: isAdmin(roles) || roles.some((r) => KIND_ROLES[kind].includes(r)),
      can_approve: isAdmin(roles) || roles.some((r) => APPROVER_ROLES[kind].includes(r)),
    };
  });

async function logApproval(c: Ctx, doc: any, action: string, to: string, note?: string | null) {
  ok(
    await c.supabase.from("document_approvals").insert({
      company_id: doc.company_id,
      generated_document_id: doc.id,
      action,
      from_status: doc.status,
      to_status: to,
      note: note ?? null,
      actor_id: c.userId,
    }).select("id"),
  );
}

export const transitionDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        action: z.enum(["submit", "approve", "reject", "issue", "void"]),
        note: z.string().max(500).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const doc = ok(await c.supabase.from("generated_documents").select("*").eq("id", data.id).is("deleted_at", null).maybeSingle());
    if (!doc) throw new Error("DOC_NOT_FOUND");
    const kind = doc.kind as DocKind;
    const needsApprover = data.action !== "submit";
    await requireKind(c, kind, needsApprover);

    const to =
      data.action === "submit" ? "review"
      : data.action === "approve" ? "approved"
      : data.action === "reject" ? "draft"
      : data.action === "issue" ? "issued"
      : "void";

    const patch: Record<string, unknown> = { status: to };

    if (data.action === "issue") {
      if (doc.status !== "approved") throw new Error("DOC_NOT_APPROVED");
      if (doc.doc_number) throw new Error("DOC_ALREADY_ISSUED");
      if (kind === "tax_invoice") {
        const company = ok(await c.supabase.from("companies").select("*").eq("id", doc.company_id).maybeSingle());
        const identity = await identityOf(c, doc.company_id);
        if (!companyComplete(company, identity)) throw new Error("COMPANY_DATA_INCOMPLETE");
      }
      const period = new Date().getUTCFullYear().toString();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const num = ok(
        await supabaseAdmin.rpc("next_document_serial", {
          _company_id: doc.company_id, _kind: kind, _prefix: DOC_KIND_PREFIX[kind], _period: period,
        }),
      );
      patch['doc_number'] = num;
      patch['issued_by'] = c.userId;
      patch['issued_at'] = new Date().toISOString();
    }

    if (data.action === "void") {
      if (!data.note) throw new Error("DOC_VOID_REASON_REQUIRED");
      patch['void_reason'] = data.note;
    }

    const updated = ok(
      await c.supabase.from("generated_documents").update(patch).eq("id", doc.id).eq("status", doc.status).select("*").single(),
    );
    await logApproval(c, doc, data.action, to, data.note);
    return updated;
  });

/** Correction path: issued documents are never edited — a new revision is created. */
export const reviseDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, reason: z.string().trim().min(3).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const doc = ok(await c.supabase.from("generated_documents").select("*").eq("id", data.id).maybeSingle());
    if (!doc) throw new Error("DOC_NOT_FOUND");
    const kind = doc.kind as DocKind;
    await requireKind(c, kind, true);

    const fresh = await buildDocumentInternal(c, kind, doc.entity_id, doc.company_id);
    const rev = ok(
      await c.supabase
        .from("generated_documents")
        .update({ revision: (doc.revision ?? 1) + 1, revision_of: doc.id })
        .eq("id", fresh.id)
        .select("*")
        .single(),
    );
    ok(await c.supabase.from("generated_documents").update({ superseded_by: rev.id }).eq("id", doc.id).select("id"));
    await logApproval(c, doc, "revise", doc.status, data.reason);
    return rev;
  });

async function buildDocumentInternal(c: Ctx, kind: DocKind, entity_id: string, company_id: string) {
  const fn = buildDocument as unknown as (a: { data: { kind: DocKind; entity_id: string } }) => Promise<any>;
  void company_id;
  return fn({ data: { kind, entity_id } });
}

export const logDocumentDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        channel: z.enum(["print", "download", "email", "whatsapp", "link"]),
        target_masked: z.string().max(120).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const doc = ok(await c.supabase.from("generated_documents").select("id,company_id").eq("id", data.id).maybeSingle());
    if (!doc) throw new Error("DOC_NOT_FOUND");
    ok(
      await c.supabase.from("document_delivery_logs").insert({
        company_id: doc.company_id,
        generated_document_id: doc.id,
        channel: data.channel,
        target_masked: data.target_masked ?? null,
        created_by: c.userId,
      }).select("id"),
    );
    return { ok: true };
  });

/** Sources available for building a document of a given kind (id + label only). */
export const listDocumentSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: kindSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const kind = data.kind as DocKind;
    await requireKind(c, kind);
    const cfg = SOURCES[kind];
    const rows = ok(
      await c.supabase.from(cfg.table).select("*").order("created_at", { ascending: false }).limit(50),
    );
    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      label: (cfg.numberFields.map((f) => r[f]).find(Boolean) as string) ?? r.id.slice(0, 8),
      date: r.issue_date ?? r.order_date ?? r.voucher_date ?? r.delivery_date ?? r.receipt_date ?? r.start_date ?? r.handover_date ?? r.created_at,
      status: r.status ?? null,
    }));
  });
