import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { authEmailToIdentifier, identifierToAuthEmail } from "@/lib/auth-identifier";

export type Role = Database["public"]["Enums"]["app_role"];

export const ADMIN_ROLES: Role[] = ["super_admin", "factory_owner", "general_manager"];

export const ROLE_LABELS: Record<Role, { ar: string; en: string }> = {
  super_admin: { ar: "مدير النظام", en: "Super Admin" },
  factory_owner: { ar: "مالك المصنع", en: "Factory Owner" },
  general_manager: { ar: "المدير العام", en: "General Manager" },
  sales_manager: { ar: "مدير المبيعات", en: "Sales Manager" },
  sales_employee: { ar: "موظف مبيعات", en: "Sales Employee" },
  production_manager: { ar: "مدير الإنتاج", en: "Production Manager" },
  warehouse_manager: { ar: "مدير المستودع", en: "Warehouse Manager" },
  purchasing_manager: { ar: "مدير المشتريات", en: "Purchasing Manager" },
  accountant: { ar: "محاسب", en: "Accountant" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  designer: { ar: "مصمم", en: "Designer" },
  technician: { ar: "فني", en: "Technician" },
  project_manager: { ar: "مدير المشاريع", en: "Project Manager" },
  quality_manager: { ar: "مدير الجودة", en: "Quality Manager" },
  installer: { ar: "فني تركيب", en: "Installer" },
  customer_portal: { ar: "بوابة العميل", en: "Customer Portal" },
};

export interface AppUser {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  role: Role;
  roles: Role[];
  companyId: string | null;
  avatarUrl?: string | null;
  jobTitle: string;
  jobTitleAr: string;
}

interface AuthCtx {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setUser(null);
      return;
    }
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    if (!profile?.is_active) {
      setUser(null);
      setSession(null);
      await supabase.auth.signOut({ scope: "local" });
      return;
    }
    const roles = (roleRows ?? []).map((r) => r.role as Role);
    const primary: Role = roles[0] ?? "technician";
    const metadataUsername =
      typeof s.user.user_metadata?.username === "string"
        ? s.user.user_metadata.username.trim().toLowerCase()
        : "";
    const username = metadataUsername || authEmailToIdentifier(s.user.email);
    const name = profile.full_name || username;
    setUser({
      id: s.user.id,
      name,
      nameAr: name,
      username,
      role: primary,
      roles,
      companyId: profile?.company_id ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      jobTitle: ROLE_LABELS[primary].en,
      jobTitleAr: ROLE_LABELS[primary].ar,
    });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadProfile(s);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (identifier: string, password: string) => {
    const email = identifierToAuthEmail(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error("ACCOUNT_DISABLED");
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (roles: Role | Role[]) => {
      if (!user) return false;
      const list = Array.isArray(roles) ? roles : [roles];
      return user.roles.some((r) => list.includes(r));
    },
    [user],
  );

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!session && !!user,
      login,
      logout,
      hasRole,
      isAdmin: !!user && user.roles.some((r) => ADMIN_ROLES.includes(r)),
      refresh,
    }),
    [user, session, loading, login, logout, hasRole, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
