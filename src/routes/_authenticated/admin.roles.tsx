import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Network,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type Role } from "@/lib/auth";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "الهيكل الوظيفي والصلاحيات · منصة المقرن" }] }),
  component: RolesPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
};

type Assignment = {
  user_id: string;
  role: Role;
};

type PermissionRow = {
  role: Role;
  can_view: boolean;
};

const ROLE_GROUPS: Array<{ titleAr: string; titleEn: string; roles: Role[] }> = [
  { titleAr: "الإدارة العليا", titleEn: "Executive leadership", roles: ["factory_owner", "general_manager", "super_admin"] },
  { titleAr: "الإيراد والعميل", titleEn: "Revenue and customer", roles: ["sales_manager", "sales_employee", "customer_portal"] },
  { titleAr: "التشغيل والتنفيذ", titleEn: "Operations and delivery", roles: ["production_manager", "project_manager", "quality_manager", "technician", "installer"] },
  { titleAr: "الإمداد والتمكين", titleEn: "Supply and support", roles: ["warehouse_manager", "purchasing_manager", "accountant", "hr", "designer"] },
];

function RolesPage() {
  const t = useT();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      if (!user?.companyId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const [profilesRes, rolesRes, permissionsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,is_active")
          .eq("company_id", user.companyId)
          .order("full_name"),
        supabase
          .from("user_roles")
          .select("user_id,role")
          .eq("company_id", user.companyId),
        supabase
          .from("role_module_permissions")
          .select("role,can_view")
          .eq("company_id", user.companyId),
      ]);

      if (cancelled) return;
      const firstError = [profilesRes, rolesRes, permissionsRes].find((result) => result.error)?.error;
      if (firstError) {
        setError(firstError.message);
        setProfiles([]);
        setAssignments([]);
        setPermissions([]);
      } else {
        setProfiles((profilesRes.data ?? []) as Profile[]);
        setAssignments((rolesRes.data ?? []) as Assignment[]);
        setPermissions((permissionsRes.data ?? []) as PermissionRow[]);
      }
      setLoading(false);
    }

    void loadOrganization();
    return () => {
      cancelled = true;
    };
  }, [user?.companyId]);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const roleMembers = (role: Role) =>
    assignments
      .filter((assignment) => assignment.role === role)
      .map((assignment) => profileById.get(assignment.user_id))
      .filter((profile): profile is Profile => Boolean(profile));

  const visibleModules = (role: Role) =>
    permissions.filter((permission) => permission.role === role && permission.can_view).length;

  const activeAccounts = profiles.filter((profile) => profile.is_active).length;
  const assignedAccounts = new Set(assignments.map((assignment) => assignment.user_id)).size;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-background shadow-card">
        <CardHeader className="border-b border-primary/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary">
                <Network className="h-4 w-4" />
                {t("هيكل تشغيلي حي", "LIVE OPERATING STRUCTURE")}
              </div>
              <CardTitle className="mt-2 text-xl">
                {t("الأدوار، الصلاحيات والموظفون", "Roles, permissions and employees")}
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                {t(
                  "كل موظف يظهر تحت دوره الحقيقي، وصلاحيات الوحدة تحدد ما يمكنه رؤيته أو تنفيذه داخل المنصة.",
                  "Each employee appears under their actual role, while module permissions determine what they can view or perform.",
                )}
              </CardDescription>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric label={t("الحسابات", "Accounts")} value={profiles.length} />
              <Metric label={t("النشطة", "Active")} value={activeAccounts} />
              <Metric label={t("مرتبطة بدور", "Assigned")} value={assignedAccounts} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-primary/25 bg-background/70 px-3 py-1">
              <CheckCircle2 className="me-1 h-3.5 w-3.5 text-success" />
              {t("التفعيل يعتمد على حساب حقيقي وليس بيانات تجريبية", "Activation uses real accounts, never demo data")}
            </Badge>
            <Badge variant="outline" className="border-primary/25 bg-background/70 px-3 py-1">
              <Shield className="me-1 h-3.5 w-3.5 text-primary" />
              {t("الصلاحيات تحفظ من مصفوفة الأدوار", "Permissions come from the role matrix")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {t("تعذر تحميل الهيكل الفعلي: ", "Could not load the live structure: ")}{error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse shadow-card">
              <CardContent className="space-y-3 p-5">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-20 rounded-xl bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ROLE_GROUPS.map((group) => (
            <Card key={group.titleEn} className="shadow-card">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">{t(group.titleAr, group.titleEn)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {group.roles.map((role) => {
                  const members = roleMembers(role);
                  const permitted = visibleModules(role);

                  return (
                    <section key={role} className="rounded-xl border border-border/80 bg-card p-4 transition hover:border-primary/30 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-semibold">{ROLE_LABELS[role].ar}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[role].en}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[11px]">
                          {permitted} {t("وحدات ظاهرة", "visible modules")}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {members.length ? members.map((member) => (
                          <div key={member.id} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-xs">
                            <span className={"h-2 w-2 shrink-0 rounded-full " + (member.is_active ? "bg-success" : "bg-muted-foreground")} />
                            <span className="truncate font-medium">{member.full_name || member.email || t("حساب بلا اسم", "Unnamed account")}</span>
                          </div>
                        )) : (
                          <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                            {t("لا يوجد موظف مفعّل بهذا الدور بعد", "No active employee is assigned to this role yet")}
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                          <Link to="/admin/permissions">
                            {t("مراجعة الصلاحيات", "Review permissions")}
                            <ChevronLeft className="ms-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </section>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed shadow-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">{t("خطوة تفعيل حساب الدور", "Role-account activation step")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "أضف الموظف الحقيقي من الموارد البشرية أو سجّله بالجوال، ثم اربط حسابه بالدور المطلوب. لا يُفعّل الحساب قبل التحقق من بيانات الموظف.",
                  "Add the real employee through HR or mobile enrollment, then assign the required role. Accounts are not activated before employee verification.",
                )}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/hr">{t("فتح الموارد البشرية", "Open HR")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[74px] rounded-xl border border-primary/15 bg-background/75 px-3 py-2 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}