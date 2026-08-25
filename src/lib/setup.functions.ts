import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseManagerContactIdentifier } from "@/lib/auth-identifier";

const bootstrapSchema = z.object({
  identifier: z.string().trim().min(8).max(320),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(2).max(120),
  companyNameAr: z.string().trim().min(2).max(160),
});

/** Public: tells the UI whether the platform still needs its first administrator. */
export const getSetupState = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("[Setup] Setup-state query failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("SETUP_STATE_UNAVAILABLE");
  }
  return { needsSetup: (count ?? 0) === 0 };
});

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    const authIdentifier = parseManagerContactIdentifier(data.identifier);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("SETUP_ALREADY_COMPLETED");

    const { error: claimError } = await supabaseAdmin.from("platform_bootstrap_claims").insert({ id: true });
    if (claimError) throw new Error("SETUP_ALREADY_COMPLETED_OR_IN_PROGRESS");

    let userId: string | null = null;
    let companyId: string | null = null;
    try {
      const createUserInput = {
        password: data.password,
        user_metadata: { full_name: data.fullName, login_identifier: authIdentifier.value },
        ...(authIdentifier.kind === "email"
          ? { email: authIdentifier.value, email_confirm: true }
          : { phone: authIdentifier.value, phone_confirm: true }),
      };
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser(createUserInput);
      if (createError || !created.user) throw new Error(createError?.message ?? "USER_CREATE_FAILED");
      userId = created.user.id;

      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({ name_ar: data.companyNameAr })
        .select("id")
        .single();
      if (companyError || !company) throw new Error(companyError?.message ?? "COMPANY_CREATE_FAILED");
      companyId = company.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        company_id: companyId,
        full_name: data.fullName,
        email: authIdentifier.kind === "email" ? authIdentifier.value : "",
        phone: authIdentifier.kind === "phone" ? authIdentifier.value : null,
      });
      if (profileError) throw new Error(profileError.message);

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, company_id: companyId, role: "super_admin" });
      if (roleError) throw new Error(roleError.message);

      await supabaseAdmin
        .from("platform_bootstrap_claims")
        .update({ completed_at: new Date().toISOString(), user_id: userId, company_id: companyId })
        .eq("id", true);

      await supabaseAdmin.from("audit_logs").insert({
        company_id: companyId,
        user_id: userId,
        action: "bootstrap_first_admin",
        entity: "user",
        entity_id: userId,
      });

      return { ok: true, companyId };
    } catch (error) {
      if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
      if (companyId) await supabaseAdmin.from("companies").delete().eq("id", companyId);
      await supabaseAdmin.from("platform_bootstrap_claims").delete().eq("id", true).is("completed_at", null);
      throw error;
    }
  });
