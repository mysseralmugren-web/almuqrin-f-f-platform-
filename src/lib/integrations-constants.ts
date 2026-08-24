/** Module 11 — Integrations, Website, WhatsApp & Notifications: UI-safe constants only. */

export const INTEGRATION_KINDS = ["website", "whatsapp", "email"] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export const INTEGRATION_KIND_LABEL: Record<IntegrationKind, { ar: string; en: string }> = {
  website: { ar: "الموقع الإلكتروني", en: "Website" },
  whatsapp: { ar: "واتساب للأعمال", en: "WhatsApp Business" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
};

export const INTEGRATION_STATUSES = ["disconnected", "configured", "active", "error", "paused"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, { ar: string; en: string }> = {
  disconnected: { ar: "غير متصل", en: "Disconnected" },
  configured: { ar: "مُعد (بانتظار الاختبار)", en: "Configured (untested)" },
  active: { ar: "نشط", en: "Active" },
  error: { ar: "خطأ", en: "Error" },
  paused: { ar: "موقوف مؤقتًا", en: "Paused" },
};

export const HEALTH_LABEL: Record<string, { ar: string; en: string }> = {
  unknown: { ar: "غير معروف", en: "Unknown" },
  healthy: { ar: "سليم", en: "Healthy" },
  degraded: { ar: "متدهور", en: "Degraded" },
  down: { ar: "متوقف", en: "Down" },
};

/** Server-side secret names required per integration. Values never reach the browser. */
export const REQUIRED_SECRETS: Record<IntegrationKind, string[]> = {
  website: ["WEBSITE_WEBHOOK_SECRET", "WEBSITE_CAPTCHA_SECRET"],
  whatsapp: ["WHATSAPP_WEBHOOK_SECRET", "WHATSAPP_API_TOKEN"],
  email: ["EMAIL_API_KEY"],
};

export const WHATSAPP_PROVIDERS = ["meta_cloud", "twilio", "360dialog", "generic"] as const;

export const SUBMISSION_KINDS = ["contact", "quote_request", "measurement"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, { ar: string; en: string }> = {
  contact: { ar: "طلب تواصل", en: "Contact request" },
  quote_request: { ar: "طلب عرض سعر", en: "Quote request" },
  measurement: { ar: "طلب قياس موقع", en: "Site measurement" },
};

export const SUBMISSION_STATUSES = ["new", "triage", "converted", "rejected", "spam"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  triage: { ar: "قيد المراجعة", en: "In triage" },
  converted: { ar: "تم التحويل", en: "Converted" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  spam: { ar: "غير مرغوب", en: "Spam" },
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, { ar: string; en: string }> = {
  low: { ar: "منخفض", en: "Low" },
  normal: { ar: "عادي", en: "Normal" },
  high: { ar: "مرتفع", en: "High" },
  urgent: { ar: "عاجل", en: "Urgent" },
};

/** SLA target in minutes per priority (first response). */
export const SLA_MINUTES: Record<Priority, number> = {
  low: 2880,
  normal: 480,
  high: 120,
  urgent: 30,
};

export const MESSAGE_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: "بالانتظار", en: "Pending" },
  sent: { ar: "أُرسلت", en: "Sent" },
  delivered: { ar: "وصلت", en: "Delivered" },
  read: { ar: "قُرئت", en: "Read" },
  failed: { ar: "فشلت", en: "Failed" },
};

export const NOTIFICATION_CHANNELS = ["in_app", "email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CHANNEL_LABEL: Record<NotificationChannel, { ar: string; en: string }> = {
  in_app: { ar: "داخل التطبيق", en: "In-app" },
  email: { ar: "البريد", en: "Email" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
};

export const OUTBOX_STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: "بالانتظار", en: "Pending" },
  processing: { ar: "قيد المعالجة", en: "Processing" },
  done: { ar: "تمت", en: "Done" },
  failed: { ar: "فشل (سيعاد)", en: "Failed (retrying)" },
  dead: { ar: "رسالة ميتة", en: "Dead letter" },
};

export const WEBSITE_DOMAIN = "www.almuqrinfurniturefactory.com";

/** Mask a phone number for display: keeps country prefix and last 3 digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length <= 5) return "***";
  return `${digits.slice(0, 4)}${"*".repeat(Math.max(0, digits.length - 7))}${digits.slice(-3)}`;
}

export const INBOX_SOURCES = ["website", "whatsapp", "notification"] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_SOURCE_LABEL: Record<InboxSource, { ar: string; en: string }> = {
  website: { ar: "الموقع", en: "Website" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  notification: { ar: "إشعار", en: "Notification" },
};
