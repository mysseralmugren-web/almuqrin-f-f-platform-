const INTERNAL_AUTH_DOMAIN = "auth.almugren.local";

export type AuthIdentifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "username"; value: string; authEmail: string };

function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 320 ? normalized : null;
}

/** Normalizes Saudi local mobile numbers and standard E.164 phone numbers. */
export function normalizePhoneNumber(value: string): string | null {
  let normalized = value.trim().replace(/[\s().-]/g, "");
  if (/^05\d{8}$/.test(normalized)) normalized = `+966${normalized.slice(1)}`;
  else if (/^9665\d{8}$/.test(normalized)) normalized = `+${normalized}`;
  else if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

/**
 * Supabase password authentication requires an email-shaped principal. The UI
 * uses usernames; this mapping stays internal and is never presented as a
 * contact address.
 */
export function identifierToAuthEmail(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalized)) {
    throw new Error("INVALID_USERNAME");
  }
  return `${normalized}@${INTERNAL_AUTH_DOMAIN}`;
}

/** Supports real email and mobile sign-in while retaining legacy internal usernames. */
export function parseAuthIdentifier(identifier: string): AuthIdentifier {
  const email = normalizeEmail(identifier);
  if (email) return { kind: "email", value: email };
  const phone = normalizePhoneNumber(identifier);
  if (phone) return { kind: "phone", value: phone };
  return { kind: "username", value: identifier.trim().toLowerCase(), authEmail: identifierToAuthEmail(identifier) };
}

/** First administrators must use a real company email or mobile number, never an internal username. */
export function parseManagerContactIdentifier(identifier: string): Exclude<AuthIdentifier, { kind: "username" }> {
  const parsed = parseAuthIdentifier(identifier);
  if (parsed.kind === "username") throw new Error("INVALID_EMAIL_OR_PHONE");
  return parsed;
}

/** Returns the UI username without exposing the synthetic auth domain. */
export function authEmailToIdentifier(authEmail: string | null | undefined): string {
  const normalized = authEmail?.trim().toLowerCase() ?? "";
  const suffix = `@${INTERNAL_AUTH_DOMAIN}`;
  return normalized.endsWith(suffix) ? normalized.slice(0, -suffix.length) : "";
}
