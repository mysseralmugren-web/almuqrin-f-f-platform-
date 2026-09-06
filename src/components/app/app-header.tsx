import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronLeft, Moon, Sun, Globe, LogOut, User as UserIcon, Settings as SettingsIcon, Fingerprint, Search } from "lucide-react";
import { useTheme, useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { getNotificationCenter, markNotificationRead } from "@/lib/integrations.functions";

export function AppHeader() {
  const { theme, toggleTheme, lang, setLang } = useTheme();
  const t = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fetchNotifications = useServerFn(getNotificationCenter);
  const readNotification = useServerFn(markNotificationRead);
  const notificationsQuery = useQuery({ queryKey: ["header-notifications"], queryFn: () => fetchNotifications({}), staleTime: 30_000 });
  const markRead = useMutation({
    mutationFn: (id: string) => readNotification({ data: { id } }),
    onSuccess: () => void notificationsQuery.refetch(),
  });
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unread = useMemo(() => notifications.filter((item: any) => !item.read_at).length, [notifications]);
  const initials = (user?.nameAr || user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <header className="factory-app-header sticky top-0 z-30 flex h-[4.35rem] items-center gap-2 border-b px-3 sm:gap-4 sm:px-6">
      <SidebarTrigger className="rounded-xl text-foreground transition hover:bg-primary/10" />
      <div className="relative hidden min-w-0 flex-1 md:block">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input aria-label={t("البحث داخل الوحدة الحالية", "Search in the current module")} disabled placeholder={t("البحث الموحد قريبًا — استخدم بحث كل وحدة", "Unified search is coming — use module search")} className="h-10 border-border/70 bg-background/70 ltr:pl-10 rtl:pr-10" />
      </div>
      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="gap-2 rounded-xl" aria-label={t("تبديل اللغة", "Toggle language")}>
          <Globe className="h-4 w-4" /><span className="hidden text-xs font-semibold sm:inline">{lang === "ar" ? "EN" : "عربي"}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl" aria-label={t("تبديل السمة", "Toggle theme")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label={unread ? t(`الإشعارات، ${unread} غير مقروءة`, `Notifications, ${unread} unread`) : t("الإشعارات", "Notifications")}>
              <Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -top-0.5 -end-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-black text-accent-foreground">{unread > 99 ? "99+" : unread}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
            <DropdownMenuLabel className="flex items-center justify-between"><span>{t("الإشعارات", "Notifications")}</span><Badge variant="secondary" className="text-[10px]">{unread}</Badge></DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsQuery.isLoading ? <div className="px-3 py-5 text-center text-xs text-muted-foreground">{t("جارٍ تحميل الإشعارات…", "Loading notifications…")}</div> : notifications.length === 0 ? <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("لا توجد إشعارات جديدة", "No new notifications")}</div> : notifications.slice(0,5).map((n: any) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-1 py-3" onSelect={() => { if (!n.read_at) markRead.mutate(n.id); }}>
                <div className="line-clamp-1 text-sm font-medium">{n.title}</div><div className="line-clamp-2 text-[11px] text-muted-foreground">{n.body}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/integrations/notifications" })} className="justify-between font-semibold">{t("عرض كل الإشعارات", "View all notifications")}<ChevronLeft className="h-4 w-4 rtl:rotate-180" /></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pe-2 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("قائمة المستخدم", "User menu")}>
              <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm"><AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials}</AvatarFallback></Avatar>
              <div className="hidden min-w-0 text-start leading-tight sm:block"><div className="truncate text-xs font-semibold">{lang === "ar" ? user?.nameAr : user?.name}</div><div className="truncate text-[10px] text-muted-foreground">{lang === "ar" ? user?.jobTitleAr : user?.jobTitle}</div></div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel><div className="text-sm font-semibold">{lang === "ar" ? user?.nameAr : user?.name}</div><div className="text-[11px] font-normal text-muted-foreground">@{user?.username}</div><Badge variant="outline" className="mt-2 border-accent/40 text-[10px] text-accent-foreground">{user?.role}</Badge></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/admin/profile" })}><UserIcon className="me-2 h-4 w-4" />{t("الملف الشخصي", "Profile")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/passkeys" })}><Fingerprint className="me-2 h-4 w-4" />{t("البصمة وFace ID", "Face ID & Passkeys")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><SettingsIcon className="me-2 h-4 w-4" />{t("الإعدادات", "Settings")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => { logout(); navigate({ to: "/login" }); }}><LogOut className="me-2 h-4 w-4" />{t("تسجيل الخروج", "Sign out")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
