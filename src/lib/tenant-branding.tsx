import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCompanyIdentity } from "@/lib/documents.functions";

export type TenantBrand = {
  nameAr: string;
  nameEn: string;
  logo: string;
  primary: string;
  secondary: string;
};

const DEFAULT_BRAND: TenantBrand = {
  nameAr: "مصنع المقرن للأثاث والديكور",
  nameEn: "ALMUQRIN FURNITURE FACTORY",
  logo: "/brand/almugren-furniture-logo.jpeg",
  primary: "#15293B",
  secondary: "#C0C7CF",
};

const BrandContext = createContext<TenantBrand>(DEFAULT_BRAND);

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const fetchIdentity = useServerFn(getCompanyIdentity);
  const { data } = useQuery({
    queryKey: ["tenant-brand"],
    queryFn: () => fetchIdentity({}),
    staleTime: 60_000,
  });

  const company = data?.company as Record<string, unknown> | undefined;
  const identity = data?.identity as Record<string, unknown> | undefined;
  const brand: TenantBrand = {
    nameAr: String(identity?.trade_name_ar || identity?.legal_name_ar || company?.name_ar || DEFAULT_BRAND.nameAr),
    nameEn: String(identity?.trade_name_en || identity?.legal_name_en || company?.name_en || DEFAULT_BRAND.nameEn),
    logo: String(identity?.logo_path || DEFAULT_BRAND.logo),
    primary: String(identity?.primary_color || DEFAULT_BRAND.primary),
    secondary: String(identity?.secondary_color || DEFAULT_BRAND.secondary),
  };

  useEffect(() => {
    document.title = `${brand.nameAr} · Factory OS`;
    document.documentElement.style.setProperty("--tenant-brand-primary", brand.primary);
    document.documentElement.style.setProperty("--tenant-brand-secondary", brand.secondary);

    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = brand.logo;

    let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = brand.logo;
  }, [brand.logo, brand.nameAr, brand.primary, brand.secondary]);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useTenantBrand() {
  return useContext(BrandContext);
}
