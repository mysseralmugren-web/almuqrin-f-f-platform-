const INTERNAL_AUTH_DOMAIN = "auth.almugren.local";

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

/** Returns the UI username without exposing the synthetic auth domain. */
export function authEmailToIdentifier(authEmail: string | null | undefined): string {
  const normalized = authEmail?.trim().toLowerCase() ?? "";
  const suffix = `@${INTERNAL_AUTH_DOMAIN}`;
  return normalized.endsWith(suffix) ? normalized.slice(0, -suffix.length) : "";
}
