import { createFileRoute } from "@tanstack/react-router";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/document/verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("t") ?? "";
        const signature = url.searchParams.get("s") ?? "";
        if (!token || !signature || token.length > 8000 || signature.length > 200) {
          return json(400, { valid: false, error: "missing_or_invalid_token" });
        }

        try {
          const { verifyVerificationToken } = await import("@/lib/document-qr.server");
          const result = verifyVerificationToken(token, signature);
          if (!result.valid) return json(401, { valid: false, error: "invalid_signature" });

          const p = result.payload;
          const pathname = String(p["pathname"] ?? "");
          if (!pathname.startsWith("/print/")) return json(401, { valid: false, error: "invalid_document_path" });

          return json(200, {
            valid: true,
            company_name: String(p["company_name"] ?? ""),
            document_title: typeof p["title"] === "string" ? p["title"] : null,
            document_reference: pathname.split("/").filter(Boolean).slice(-2).join(" / "),
            generated_at: String(p["generated_at"] ?? ""),
            status: "issued_from_platform",
          });
        } catch (error) {
          if (error instanceof Error && error.message === "DOCUMENT_QR_SECRET_MISSING") {
            return json(503, { valid: false, error: "verification_unavailable" });
          }
          return json(400, { valid: false, error: "invalid_token" });
        }
      },
    },
  },
});
