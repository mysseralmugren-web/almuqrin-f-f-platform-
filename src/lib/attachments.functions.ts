import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

export const BUCKET = "mfg-attachments";

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

const safeName = (n: string) => n.replace(/[^\w.\-\u0600-\u06FF]/g, "_").slice(-80);

/** Returns a short-lived signed upload URL scoped under the caller's company folder. */
export const createAttachmentUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        entity: z.enum([
          "manufacturing_order",
          "quality_inspection",
          "supplier",
          "purchase_request",
          "rfq",
          "purchase_order",
          "goods_receipt",
          "supplier_invoice",
          "supplier_return",
          "file_center",
        ]),
        entity_id: z.string().uuid(),
        file_name: z.string().trim().min(1).max(160),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const path = `${company_id}/${data.entity}/${data.entity_id}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const { data: signed, error } = await c.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const registerAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        entity: z.string().min(1).max(40),
        entity_id: z.string().uuid(),
        object_path: z.string().min(1).max(400),
        file_name: z.string().min(1).max(160),
        content_type: z.string().max(120).optional().nullable(),
        size_bytes: z.number().int().nonnegative().max(200 * 1024 * 1024).optional().nullable(),
        title: z.string().trim().min(1).max(160).optional(),
        description: z.string().max(2000).optional().nullable(),
        category: z.enum(["plans","contracts","invoices","site_photos","designs","other"]).optional(),
        checksum: z.string().regex(/^[a-f0-9]{64}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    if (!data.object_path.startsWith(`${company_id}/`)) throw new Error("PATH_OUTSIDE_COMPANY");
    const { data: row, error } = await c.supabase
      .from("attachments")
      .insert({ ...data, company_id, created_by: c.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ entity: z.string().min(1), entity_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: rows, error } = await c.supabase
      .from("attachments")
      .select("*")
      .eq("entity", data.entity)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Short-lived (5 min) signed download URL. The bucket itself is private. */
export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attachment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: att, error } = await c.supabase
      .from("attachments")
      .select("object_path")
      .eq("id", data.attachment_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!att) throw new Error("ATTACHMENT_NOT_FOUND");
    const { data: signed, error: sErr } = await c.supabase.storage.from(BUCKET).createSignedUrl(att.object_path, 300);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, expires_in: 300 };
  });

export const listFileCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data, error } = await c.supabase.from("attachments").select("*").eq("company_id", company_id).order("sort_order").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id:z.string().uuid(), title:z.string().trim().min(1).max(160).optional(), description:z.string().max(2000).nullable().optional(),
    category:z.enum(["plans","contracts","invoices","site_photos","designs","other"]).optional(), deleted_at:z.string().datetime().nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const c=context as Ctx; const company_id=await companyOf(c);
    const { id, ...changes }=data; const { error }=await c.supabase.from("attachments").update({...changes,updated_at:new Date().toISOString()}).eq("id",id).eq("company_id",company_id);
    if(error) throw new Error(error.message); return {ok:true};
  });

