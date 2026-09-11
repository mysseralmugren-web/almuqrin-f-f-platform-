import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RENDER_CALLBACK_SECRET = Deno.env.get("RENDER_CALLBACK_SECRET");
const MAX_BYTES = 100 * 1024 * 1024;

function out(body: unknown, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": typeof body === "string" ? "text/plain" : "application/json", "Cache-Control": "no-store" },
  });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(message: string) {
  if (!RENDER_CALLBACK_SECRET) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RENDER_CALLBACK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function safeEqual(a: string, b: string) {
  if (!a.length || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "PUT" && req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job") ?? "";
    const path = url.searchParams.get("path") ?? "";
    const exp = Number(url.searchParams.get("exp") ?? 0);
    const sig = url.searchParams.get("sig") ?? "";
    if (!jobId || !path || !exp || !sig) return out({ error: "Invalid callback" }, 400);
    if (Math.floor(Date.now() / 1000) > exp) return out({ error: "Callback expired" }, 401);
    if (!safeEqual(await hmac(`${jobId}\n${path}\n${exp}`), sig)) return out({ error: "Invalid signature" }, 401);

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return out({ error: "Render too large" }, 413);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return out({ error: "Invalid render payload" }, 413);

    const contentType = (req.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "model/gltf-binary",
      "model/gltf+json",
      "application/octet-stream",
    ];
    if (!allowed.includes(contentType)) return out({ error: "Unsupported render content type" }, 415);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: job, error: jobError } = await admin
      .from("interior_render_jobs")
      .select("id,output_bucket,output_path,status")
      .eq("id", jobId)
      .single();
    if (jobError || !job) return out({ error: "Unknown render job" }, 404);
    if (String(job.output_path) !== path) return out({ error: "Output path mismatch" }, 403);

    const { error: uploadError } = await admin.storage
      .from(String(job.output_bucket))
      .upload(path, bytes, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await admin.from("interior_render_jobs").update({
      status: "succeeded",
      output_content_type: contentType,
      output_size_bytes: bytes.byteLength,
      error_message: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    if (updateError) throw updateError;

    return out("ok");
  } catch (error) {
    console.error("render-output", { message: error instanceof Error ? error.message : "Unknown error" });
    return out({ error: "Render output ingestion failed" }, 500);
  }
});
