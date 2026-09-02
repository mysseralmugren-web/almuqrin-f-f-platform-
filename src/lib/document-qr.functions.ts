import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"];

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function requireAdmin(c: Ctx) {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r: { role: string }) => ADMIN.includes(r.role))) throw new Error("FORBIDDEN");
}

export const getDocumentQrSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return getDocumentQrSettingsForContext(c, company_id);
  });

const settingsSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(["footer", "header"]),
  size_px: z.number().int().min(64).max(180),
  label_ar: z.string().trim().min(2).max(100),
  label_en: z.string().trim().min(2).max(100),
  show_internal_on_tax_invoice: z.boolean(),
});

export const saveDocumentQrSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireAdmin(c);
    const company_id = await companyOf(c);
    const { data: saved, error } = await c.supabase
      .from("document_qr_settings")
      .upsert({ company_id, ...data, updated_at: new Date().toISOString() }, { onConflict: "company_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

const qrRequestSchema = z.object({
  pathname: z.string().min(1).max(500),
  title: z.string().max(200).optional(),
});

export const getPrintVerificationQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => qrRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const settings = await getDocumentQrSettingsForContext(c, company_id);
    if (!settings.enabled) return { enabled: false as const };

    const identityResult = await c.supabase.from("company_identity").select("trade_name_ar,trade_name_en").eq("company_id", company_id).maybeSingle();
    const companyResult = await c.supabase.from("companies").select("name_ar,name_en").eq("id", company_id).maybeSingle();
    const payload = {
      v: 1,
      company_id,
      company_name: identityResult.data?.trade_name_ar ?? companyResult.data?.name_ar ?? "",
      pathname: data.pathname,
      title: data.title ?? null,
      generated_at: new Date().toISOString(),
    };
    const { createVerificationToken } = await import("@/lib/document-qr.server");
    const { token, sig } = createVerificationToken(payload);
    return { enabled: true as const, token, sig, settings, payload };
  });

async function getDocumentQrSettingsForContext(c: Ctx, company_id: string) {
  const { data, error } = await c.supabase.from("document_qr_settings").select("*").eq("company_id", company_id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? {
    company_id,
    enabled: true,
    position: "footer",
    size_px: 96,
    label_ar: "امسح للتحقق من صحة المستند",
    label_en: "Scan to verify this document",
    show_internal_on_tax_invoice: true,
  };
}
