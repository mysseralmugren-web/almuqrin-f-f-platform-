export const DOCUMENT_DESIGN_VARIANTS = [
  {
    id: "formal",
    ar: "رسمي كلاسيكي",
    en: "Formal Classic",
    descriptionAr: "مخصص للفواتير والسندات والمستندات المالية مع أولوية للوضوح والأرقام.",
    accent: "navy",
  },
  {
    id: "operations",
    ar: "تنفيذي حديث",
    en: "Modern Operations",
    descriptionAr: "مخصص لأوامر التنفيذ والتعديل وخروج البضاعة واعتمادات المصنع.",
    accent: "silver",
  },
  {
    id: "client",
    ar: "فاخر للعميل",
    en: "Client Premium",
    descriptionAr: "مخصص للتصميمات والعروض والمستندات التي ترسل للعميل مع إبراز الهوية البصرية.",
    accent: "navy-silver",
  },
] as const;

export type DocumentDesignVariant = (typeof DOCUMENT_DESIGN_VARIANTS)[number]["id"];

export const UNIFIED_DOCUMENT_MODELS = [
  { key: "tax_invoice", ar: "فاتورة بيع", defaultVariant: "formal" },
  { key: "manufacturing_order", ar: "أمر تنفيذ", defaultVariant: "operations" },
  { key: "receipt_voucher", ar: "سند استلام مبلغ", defaultVariant: "formal" },
  { key: "delivery_note", ar: "أمر خروج بضاعة", defaultVariant: "operations" },
  { key: "change_order", ar: "أمر تعديل", defaultVariant: "operations" },
  { key: "client_design", ar: "التصميمات المرسلة للعميل", defaultVariant: "client" },
] as const satisfies ReadonlyArray<{
  key: string;
  ar: string;
  defaultVariant: DocumentDesignVariant;
}>;

export const DOCUMENT_BRAND_POLICY = {
  primaryColor: "#1E3A5F",
  secondaryColor: "#C0C0C0",
  logoPath: "/brand/almugren-furniture-logo.jpeg",
  watermarkRequired: true,
  watermarkOwnerOnly: true,
  watermarkDefaultOpacity: 0.1,
  watermarkDefaultPosition: "center",
  lockPublishedVersion: true,
  revisionOnChange: true,
  sharedHeader: true,
  sharedFooter: true,
  sharedTypography: true,
  sharedQr: true,
} as const;
