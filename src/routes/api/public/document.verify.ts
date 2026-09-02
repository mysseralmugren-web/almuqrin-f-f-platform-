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
          const companyId = String(p["company_id"] ?? "");
          const isPrint = pathname.startsWith("/print/");
          const docMatch = pathname.match(/^\/documents\/([0-9a-f-]{36})$/i);
          if (!isPrint && !docMatch) return json(401, { valid: false, error: "invalid_document_path" });

          let liveStatus = "issued_from_platform";
          let docNumber: string | null = null;
          let kind: string | null = null;
          if (docMatch?.[1]) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: doc } = await supabaseAdmin
              .from("generated_documents")
              .select("doc_number,status,kind,company_id")
              .eq("id", docMatch[1])
              .eq("company_id", companyId)
              .maybeSingle();
            if (!doc) return json(404, { valid: false, error: "document_not_found" });
            liveStatus = String(doc.status ?? "unknown");
            docNumber = doc.doc_number ?? null;
            kind = doc.kind ?? null;
          }

          return json(200, {
            valid: true,
            company_name: String(p["company_name"] ?? ""),
            document_title: typeof p["title"] === "string" ? p["title"] : null,
            document_reference: docNumber ?? pathname.split("/").filter(Boolean).slice(-2).join(" / "),
            document_kind: kind,
            generated_at: String(p["generated_at"] ?? ""),
            status: liveStatus,
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
