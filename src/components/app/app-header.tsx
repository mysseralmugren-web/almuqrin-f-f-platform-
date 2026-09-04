import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Bell, Search, Moon, Sun, Globe, LogOut, User as UserIcon, Settings as SettingsIcon, Fingerprint } from "lucide-react";
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

      <div className="relative hidden min-w-0 flex-1 md:block">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input
          placeholder={t("ابحث في كل الوحدات...", "Search across all modules...")}
          className="h-10 border-border bg-surface ltr:pl-10 rtl:pr-10"
        />
      </div>

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 h-2 w-2 rounded-full bg-accent ltr:right-1.5 rtl:left-1.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>{t("الإشعارات", "Notifications")}</span>
              <Badge variant="secondary" className="text-[10px]">3</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { ar: "طلب إنتاج جديد #PO-2041", en: "New production order #PO-2041" },
              { ar: "انخفاض مخزون خشب الزان", en: "Beech wood stock is low" },
              { ar: "تمت الموافقة على عرض السعر Q-118", en: "Quotation Q-118 approved" },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex-col items-start gap-1 py-3">
                <div className="text-sm font-medium">{t(n.ar, n.en)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("قبل دقائق", "A few minutes ago")}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
            <DropdownMenuItem>
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
