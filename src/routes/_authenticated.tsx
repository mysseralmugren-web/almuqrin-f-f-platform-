import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { PrintVerificationQr } from "@/components/app/print-verification-qr";
import { PlatformWatermark } from "@/components/app/platform-watermark";
import { TenantBrandingProvider } from "@/lib/tenant-branding";
import { ModulePermissionsProvider, useModulePermissions } from "@/lib/module-permissions";
import { moduleKeyForPath } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated")({ component: AuthenticatedLayout });

function PermissionBoundary({ children }: { children: ReactNode }) {
  const location=useLocation();
  const { loading, can }=useModulePermissions();
  if(loading) return <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">جارٍ تحميل صلاحيات الدور…</div>;
  const moduleKey=moduleKeyForPath(location.pathname);
  if(moduleKey && !can(moduleKey,"view")) return <div className="mx-auto max-w-xl rounded-3xl border bg-card p-10 text-center"><h1 className="text-2xl font-bold">لا توجد صلاحية لعرض هذه اللوحة</h1><p className="mt-3 text-sm text-muted-foreground">ظهور لوحات منصة المقرن مرتبط بصلاحيات الدور المعتمدة من الإدارة.</p></div>;
  return <>{children}</>;
}

function Shell() {
  const location=useLocation();
  const isPrint=location.pathname.startsWith("/print/");
  const isGeneratedDocument=/^\/documents\/[0-9a-f-]{36}$/i.test(location.pathname);
  if(isPrint) return <main className="min-h-screen bg-white p-4 text-slate-950 print:p-0"><PermissionBoundary><Outlet/></PermissionBoundary><PlatformWatermark/><PrintVerificationQr pathname={location.pathname}/></main>;
  return <SidebarProvider><div className="flex min-h-screen w-full bg-surface"><AppSidebar/><SidebarInset className="flex min-w-0 flex-1 flex-col"><AppHeader/><main className="flex-1 p-4 sm:p-6 lg:p-8"><PermissionBoundary><Outlet/></PermissionBoundary></main></SidebarInset><PlatformWatermark/>{isGeneratedDocument&&<PrintVerificationQr pathname={location.pathname}/>}</div></SidebarProvider>;
}

function AuthenticatedLayout() {
  const { isAuthenticated, loading }=useAuth();
  const navigate=useNavigate();
  useEffect(()=>{if(!loading&&!isAuthenticated)navigate({to:"/login",replace:true})},[isAuthenticated,loading,navigate]);
  if(loading||!isAuthenticated)return null;
  return <TenantBrandingProvider><ModulePermissionsProvider><Shell/></ModulePermissionsProvider></TenantBrandingProvider>;
}
