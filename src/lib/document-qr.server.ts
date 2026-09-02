import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env["DOCUMENT_QR_SECRET"];
  if (!value || value.length < 32) throw new Error("DOCUMENT_QR_SECRET_MISSING");
  return value;
}

export function createVerificationToken(payload: Record<string, unknown>) {
  const token = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(token).digest("base64url");
  return { token, sig };
}

export function verifyVerificationToken(token: string, signature: string) {
  const expected = createHmac("sha256", secret()).update(token).digest("base64url");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false as const };

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Record<string, unknown>;
    if (parsed["v"] !== 1 || typeof parsed["company_id"] !== "string" || typeof parsed["pathname"] !== "string") {
      return { valid: false as const };
    }
    return { valid: true as const, payload: parsed };
  } catch {
    return { valid: false as const };
  }
}
