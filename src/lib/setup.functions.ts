import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { identifierToAuthEmail } from "@/lib/auth-identifier";

/** Public username is not an authorization factor; BOOTSTRAP_TOKEN is. */
export const BOOTSTRAP_ADMIN_USERNAME = "almuqrin_admin";

const bootstrapSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(12).max(128),
  bootstrapToken: z.string().min(32).max(512),
  fullName: z.string().trim().min(2).max(120),
  companyNameAr: z.string().trim().min(2).max(160),
});

/** Public: tells the UI whether the platform still needs its first administrator. */
export const getSetupState = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { needsSetup: (count ?? 0) === 0 };
});

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    const expectedToken = process.env["BOOTSTRAP_TOKEN"];
    if (!expectedToken || expectedToken.length < 32) throw new Error("BOOTSTRAP_NOT_CONFIGURED");

    const { createHash, timingSafeEqual } = await import("node:crypto");
    const suppliedDigest = createHash("sha256").update(data.bootstrapToken).digest();
    const expectedDigest = createHash("sha256").update(expectedToken).digest();
    if (!timingSafeEqual(suppliedDigest, expectedDigest)) throw new Error("BOOTSTRAP_NOT_AUTHORIZED");
    if (data.username.trim().toLowerCase() !== BOOTSTRAP_ADMIN_USERNAME) {
      throw new Error("BOOTSTRAP_USERNAME_NOT_ALLOWED");
    }

    const authEmail = identifierToAuthEmail(data.username);

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
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, username: BOOTSTRAP_ADMIN_USERNAME },
      });
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
        email: "",
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
