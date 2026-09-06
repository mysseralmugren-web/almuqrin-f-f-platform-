import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_URL = Deno.env.get("BLENDER_RENDER_WORKER_URL")?.replace(/\/$/, "");
const WORKER_KEY = Deno.env.get("BLENDER_RENDER_WORKER_KEY");
const CALLBACK_SECRET = Deno.env.get("RENDER_CALLBACK_SECRET");
const BUCKET = "interior-renders";
const MAX_BODY_BYTES = 120_000;
const MAX_WORKER_RESPONSE_BYTES = 250_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: unknown) {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))),
  );
}

async function hmac(message: string) {
  if (!CALLBACK_SECRET || CALLBACK_SECRET.length < 32) {
    throw Object.assign(new Error("RENDER_CALLBACK_SECRET is not configured"), { status: 503 });
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CALLBACK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function safeWorkerUrl(path = "/render") {
  if (!WORKER_URL)
    throw Object.assign(new Error("Blender render worker is not configured"), { status: 503 });
  const base = new URL(WORKER_URL);
  if (base.protocol !== "https:" || base.username || base.password) {
    throw Object.assign(new Error("Blender render worker must use HTTPS"), { status: 503 });
  }
  const host = base.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
    throw Object.assign(new Error("Blender render worker host is not allowed"), { status: 503 });
  }
  return new URL(path, base.origin).toString();
}

function qualityDefaults(quality: string) {
  if (quality === "ultra") return { width: 3840, height: 2160, samples: 512, denoise: true };
  if (quality === "high") return { width: 2560, height: 1440, samples: 256, denoise: true };
  return { width: 1280, height: 720, samples: 64, denoise: true };
}

async function readJson(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES)
    throw Object.assign(new Error("Request body is too large"), { status: 413 });
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Request body is too large"), { status: 413 });
  }
  try {
    return JSON.parse(text || "{}") as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

async function getProfile(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("company_id,is_active")
    .eq("id", userId)
    .single();
  if (error || !data?.company_id || !data.is_active) {
    throw Object.assign(new Error("Active company profile required"), { status: 403 });
  }
  return data as { company_id: string; is_active: boolean };
}

async function submitWorker(payload: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(safeWorkerUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WORKER_KEY ? { Authorization: `Bearer ${WORKER_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_WORKER_RESPONSE_BYTES) throw new Error("Worker response is too large");
    const text = (await response.text()).slice(0, MAX_WORKER_RESPONSE_BYTES);
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text.slice(0, 500) };
    }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw Object.assign(new Error("Blender render worker timed out"), { status: 504 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const profile = await getProfile(client, user.id);
    const body = await readJson(req);
    const action = String(body.action ?? "capabilities");

    if (action === "capabilities") {
      return json({
        version: "9.0.0",
        engine: "AlMuqrin Blender Render Engine",
        backends: ["blender"],
        workerConfigured: Boolean(WORKER_URL && WORKER_KEY && CALLBACK_SECRET),
        presets: ["studio_three_point", "softbox_product"],
        quality: {
          draft: qualityDefaults("draft"),
          high: qualityDefaults("high"),
          ultra: qualityDefaults("ultra"),
        },
        outputs: ["png", "jpeg", "webp"],
      });
    }
    if (action === "health") {
      if (!WORKER_URL || !WORKER_KEY || !CALLBACK_SECRET)
        return json({
          connected: false,
          configured: false,
          reason: "Render worker settings are incomplete",
        });
      safeWorkerUrl();
      return json({
        connected: true,
        configured: true,
        provider: "blender-worker",
        checkedAt: new Date().toISOString(),
      });
    }
    if (action === "submit") {
      const sceneSpec =
        body.sceneSpec && typeof body.sceneSpec === "object" ? body.sceneSpec : null;
      if (!sceneSpec) return json({ error: "sceneSpec is required" }, 400);
      if (JSON.stringify(sceneSpec).length > 100_000)
        return json({ error: "sceneSpec is too large" }, 413);
      const quality = ["draft", "high", "ultra"].includes(String(body.quality))
        ? String(body.quality)
        : "draft";
      const outputFormat = ["png", "jpeg", "webp"].includes(String(body.outputFormat))
        ? String(body.outputFormat)
        : "png";
      const preset = ["studio_three_point", "softbox_product"].includes(String(body.preset))
        ? String(body.preset)
        : "studio_three_point";
      const subjectSizeM = Number(body.subjectSizeM ?? 1);
      if (!Number.isFinite(subjectSizeM) || subjectSizeM < 0.1 || subjectSizeM > 20)
        return json({ error: "subjectSizeM must be between 0.1 and 20" }, 400);
      const idempotencyKey = String(body.idempotencyKey ?? "").slice(0, 120);
      if (!/^[A-Za-z0-9:_-]{8,120}$/.test(idempotencyKey))
        return json({ error: "Valid idempotencyKey required" }, 400);
      const { data: existing } = await admin
        .from("interior_render_jobs")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) return json({ version: "9.0.0", job: existing, duplicate: true });

      const jobId = crypto.randomUUID();
      const projectId =
        typeof body.projectId === "string" && /^[0-9a-f-]{36}$/i.test(body.projectId)
          ? body.projectId
          : null;
      const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;
      const outputPath = `${profile.company_id}/${projectId ?? "unassigned"}/${jobId}.${extension}`;
      const expiresAt = Math.floor(Date.now() / 1000) + 7200;
      const signature = await hmac(`${jobId}\n${outputPath}\n${expiresAt}`);
      const callbackUrl = `${SUPABASE_URL}/functions/v1/render-output?job=${encodeURIComponent(jobId)}&path=${encodeURIComponent(outputPath)}&exp=${expiresAt}&sig=${signature}`;
      const renderSettings = {
        ...qualityDefaults(quality),
        engine: "cycles",
        denoise: true,
        viewTransform: "AgX",
        preset,
        subjectSizeM,
        outputFormat,
      };
      const requestFingerprint = await sha256({ sceneSpec, renderSettings });
      const { data: inserted, error: insertError } = await admin
        .from("interior_render_jobs")
        .insert({
          id: jobId,
          company_id: profile.company_id,
          project_id: projectId,
          design_run_id: typeof body.designRunId === "string" ? body.designRunId : null,
          requested_by: user.id,
          backend: "blender",
          quality,
          status: "queued",
          scene_spec: sceneSpec,
          output_bucket: BUCKET,
          output_path: outputPath,
          idempotency_key: idempotencyKey,
          request_fingerprint: requestFingerprint,
          preset,
          subject_size_m: subjectSizeM,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      const worker = await submitWorker({ jobId, sceneSpec, renderSettings, callbackUrl });
      if (!worker.ok) {
        await admin
          .from("interior_render_jobs")
          .update({
            status: "failed",
            error_message: `worker_submit_${worker.status}`,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        return json({ error: "Render worker rejected the job" }, 502);
      }
      const { data: updated, error: updateError } = await admin
        .from("interior_render_jobs")
        .update({
          status: "submitted",
          worker_job_id: String(worker.data.jobId ?? jobId),
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .select("*")
        .single();
      if (updateError) throw updateError;
      return json({ version: "9.0.0", job: updated ?? inserted }, 202);
    }

    const jobId = String(body.jobId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ error: "Valid jobId is required" }, 400);
    const { data: job, error: jobError } = await client
      .from("interior_render_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (jobError || !job) return json({ error: "Render job not found or inaccessible" }, 404);
    if (action === "status") return json({ version: "9.0.0", job });
    if (action === "result") {
      if (job.status !== "succeeded" || !job.output_path)
        return json({ error: "Render result is not ready", status: job.status }, 409);
      const { data, error } = await admin.storage
        .from(job.output_bucket)
        .createSignedUrl(job.output_path, 900);
      if (error || !data?.signedUrl)
        throw Object.assign(new Error("Unable to sign render output"), { status: 500 });
      return json({
        version: "9.0.0",
        job,
        contentType: job.output_content_type,
        sizeBytes: job.output_size_bytes,
        signedUrl: data.signedUrl,
      });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    const status = Number((error as { status?: number })?.status ?? 500);
    console.error("render-engine", {
      status,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return json(
      {
        error:
          status >= 500
            ? "Render orchestration failed"
            : error instanceof Error
              ? error.message
              : "Request failed",
      },
      status >= 400 && status < 600 ? status : 500,
    );
  }
});
