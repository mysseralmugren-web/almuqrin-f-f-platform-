import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { TenantBrandingProvider } from "@/lib/tenant-branding";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/login", replace: true });
  }, [isAuthenticated, loading, navigate]);

  if (loading || !isAuthenticated) return null;

  return (
    <TenantBrandingProvider>
      {location.pathname.startsWith("/print/") ? (
        <main className="min-h-screen bg-white p-4 text-slate-950 print:p-0">
          <Outlet />
        </main>
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-surface">
            <AppSidebar />
            <SidebarInset className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      )}
    </TenantBrandingProvider>
  );
}
