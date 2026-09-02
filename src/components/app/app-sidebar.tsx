import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { MODULES, GROUP_LABELS, type ModuleDef } from "@/lib/modules";
import { useT, useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useTenantBrand } from "@/lib/tenant-branding";

export function AppSidebar() {
  const t = useT();
  const { lang } = useTheme();
  const { user } = useAuth();
  const brand = useTenantBrand();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const grouped = MODULES.reduce<Record<string, ModuleDef[]>>((acc, m) => {
    if (m.roles && user && !user.roles.some((r) => m.roles!.includes(r))) return acc;
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  return (
    <Sidebar collapsible="icon" side={lang === "ar" ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-elegant">
            <img src={brand.logo} alt={lang === "ar" ? brand.nameAr : brand.nameEn} className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold text-sidebar-foreground">
                {lang === "ar" ? brand.nameAr : brand.nameEn}
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">
                {t("منظومة المصنع الذكية", "Factory OS")}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {(Object.keys(grouped) as ModuleDef["group"][]).map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>
              {lang === "ar" ? GROUP_LABELS[group].ar : GROUP_LABELS[group].en}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grouped[group].map((m) => {
                  const active = pathname === m.path;
                  const Icon = m.icon;
                  return (
                    <SidebarMenuItem key={m.key}>
                      <SidebarMenuButton asChild isActive={active} tooltip={lang === "ar" ? m.labelAr : m.labelEn}>
                        <Link to={m.path} className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{lang === "ar" ? m.labelAr : m.labelEn}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 text-[11px] text-sidebar-foreground/60">
            v1.0 · {t("النسخة التجريبية", "Preview build")}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
