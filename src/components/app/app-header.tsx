import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Bell, Moon, Sun, Globe, LogOut, User as UserIcon, Settings as SettingsIcon, Fingerprint } from "lucide-react";
import { useTheme, useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function AppHeader() {
  const { theme, toggleTheme, lang, setLang } = useTheme();
  const t = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.nameAr || user?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur sm:gap-4 sm:px-6">
      <SidebarTrigger className="text-foreground" />
<div className="hidden min-w-0 flex-1 md:block" aria-hidden />

      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="gap-2"
          aria-label="Toggle language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden text-xs font-semibold sm:inline">
            {lang === "ar" ? "EN" : "عربي"}
          </span>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label={t("الإشعارات", "Notifications")} onClick={() => navigate({ to: "/integrations/notifications" })}>
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full p-1 pe-2 transition-colors hover:bg-muted"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-start leading-tight sm:block">
                <div className="truncate text-xs font-semibold">
                  {lang === "ar" ? user?.nameAr : user?.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {lang === "ar" ? user?.jobTitleAr : user?.jobTitle}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">
                {lang === "ar" ? user?.nameAr : user?.name}
              </div>
              <div className="text-[11px] font-normal text-muted-foreground">
                @{user?.username}
              </div>
              <Badge variant="outline" className="mt-2 border-accent/40 text-[10px] text-accent-foreground">
                {user?.role}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/admin/profile" })}>
              <UserIcon className="me-2 h-4 w-4" />
              {t("الملف الشخصي", "Profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/passkeys" })}>
              <Fingerprint className="me-2 h-4 w-4" />
              {t("البصمة وFace ID", "Face ID & Passkeys")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
              <SettingsIcon className="me-2 h-4 w-4" />
              {t("الإعدادات", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="me-2 h-4 w-4" />
              {t("تسجيل الخروج", "Sign out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
