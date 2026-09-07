import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.111.0";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const ASSIGNABLE_ROLES = new Set([
  "general_manager",
  "sales_manager",
  "sales_employee",
  "production_manager",
  "warehouse_manager",
  "purchasing_manager",
  "accountant",
  "hr",
  "designer",
  "technician",
  "project_manager",
  "quality_manager",
  "installer",
  "customer_portal",
]);

function normalizeSaudiPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^9665\d{8}$/.test(digits)) return `+${digits}`;
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  return "";
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint8Array(12));
  return `M!${Array.from(values, (value) => alphabet[value % alphabet.length]).join("")}7`;
}

async function requireAccountManager(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw Object.assign(new Error("يلزم تسجيل الدخول"), { status: 401 });

  const client = createClient(URL, ANON, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw Object.assign(new Error("جلسة الدخول غير صالحة"), { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("company_id,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.company_id || !profile.is_active) {
    throw Object.assign(new Error("حساب إداري نشط مطلوب"), { status: 403 });
  }

  const { data: roles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("company_id", profile.company_id);
  if (rolesError) throw rolesError;

  const allowed = new Set(["super_admin", "factory_owner", "general_manager"]);
  if (!(roles ?? []).some((row) => allowed.has(String(row.role)))) {
    throw Object.assign(new Error("إنشاء حسابات الأدوار متاح للإدارة العليا فقط"), { status: 403 });
  }

  return { actorId: user.id, companyId: String(profile.company_id) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let createdUserId = "";
  try {
    const context = await requireAccountManager(req);
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const phone = normalizeSaudiPhone(body.phone);
    const role = String(body.role ?? "");

    if (fullName.length < 2) return json({ error: "أدخل اسم الموظف كاملاً" }, 400);
    if (!phone) return json({ error: "أدخل رقم جوال سعودي صحيحاً مثل 05xxxxxxxx" }, 400);
    if (!ASSIGNABLE_ROLES.has(role)) return json({ error: "الدور المحدد غير مسموح بإنشائه من هذه الشاشة" }, 400);

    const password = temporaryPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { must_change_password: true },
    });
    if (createError || !created.user) {
      const duplicate = /already|registered|exists/i.test(createError?.message ?? "");
      return json(
        { error: duplicate ? "رقم الجوال مسجل مسبقاً في حساب آخر" : "تعذر إنشاء حساب الدخول" },
        duplicate ? 409 : 400,
      );
    }
    createdUserId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: createdUserId,
      company_id: context.companyId,
      full_name: fullName,
      phone,
      language: "ar",
      timezone: "Asia/Riyadh",
      is_active: true,
    });
    if (profileError) throw profileError;

    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: createdUserId,
      company_id: context.companyId,
      role,
    });
    if (roleError) throw roleError;

    return json({
      user: { id: createdUserId, fullName, phone, role, isActive: true },
      temporaryPassword: password,
      message: "تم إنشاء حساب الدور وتفعيله",
    });
  } catch (error) {
    if (createdUserId) {
      await admin.from("user_roles").delete().eq("user_id", createdUserId);
      await admin.from("profiles").delete().eq("id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
    }
    const rawStatus = Number((error as { status?: number })?.status ?? 500);
    const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
    console.error("role-account-admin", {
      status,
      message: error instanceof Error ? error.message : String(error),
    });
    return json(
      { error: status >= 500 ? "تعذر إنشاء الحساب. لم يتم حفظ أي بيانات جزئية." : (error instanceof Error ? error.message : "تعذر تنفيذ الطلب") },
      status,
    );
  }
});
