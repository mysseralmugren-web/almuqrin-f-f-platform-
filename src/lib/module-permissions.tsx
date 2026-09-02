import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Action = "view" | "create" | "edit" | "approve" | "delete" | "export";
type PermissionRow = {
  role: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_delete: boolean;
  can_export: boolean;
};

type PermissionMap = Record<string, Record<Action, boolean>>;

type Ctx = {
  loading: boolean;
  permissions: PermissionMap;
  can: (moduleKey: string, action?: Action) => boolean;
  refresh: () => Promise<void>;
};

const PermissionContext = createContext<Ctx | null>(null);

export function ModulePermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PermissionRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.companyId || !user.roles.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("role_module_permissions")
      .select("role,module_key,can_view,can_create,can_edit,can_approve,can_delete,can_export")
      .eq("company_id", user.companyId)
      .in("role", user.roles);
    if (error) console.error("role_module_permissions", error.message);
    setRows((data ?? []) as PermissionRow[]);
    setLoading(false);
  }, [user?.companyId, user?.roles.join("|")]);

  useEffect(() => { void load(); }, [load]);

  const permissions = useMemo<PermissionMap>(() => {
    const out: PermissionMap = {};
    for (const row of rows) {
      const entry = out[row.module_key] ??= { view:false, create:false, edit:false, approve:false, delete:false, export:false };
      entry.view ||= row.can_view;
      entry.create ||= row.can_create;
      entry.edit ||= row.can_edit;
      entry.approve ||= row.can_approve;
      entry.delete ||= row.can_delete;
      entry.export ||= row.can_export;
    }
    return out;
  }, [rows]);

  const can = useCallback((moduleKey: string, action: Action = "view") => Boolean(permissions[moduleKey]?.[action]), [permissions]);
  const value = useMemo(() => ({ loading, permissions, can, refresh: load }), [loading, permissions, can, load]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function useModulePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("useModulePermissions must be used within ModulePermissionsProvider");
  return ctx;
}
