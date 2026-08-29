export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

export const fail = (status: number, code: string, message: string, details?: unknown) =>
  json({ success: false, error: { code, message, details } }, status);

/** Strips optional `/api/v1` and function-name prefixes, returns clean path segments. */
export function segments(url: string, fnName: string): string[] {
  const path = new URL(url).pathname;
  const parts = path.split("/").filter(Boolean);
  const cleaned: string[] = [];
  for (const p of parts) {
    if (cleaned.length === 0 && (p === "functions" || p === "v1" || p === "api" || p === fnName)) continue;
    cleaned.push(p);
  }
  return cleaned;
}

/** Simple in-memory sliding-window rate limiter (per isolate). */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return hits.length <= limit;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ONLINE_THRESHOLD_MINUTES = Number(Deno.env.get("ONLINE_THRESHOLD_MINUTES") ?? "5");

export function computeStatus(lastSeen: string | null): "online" | "idle" | "offline" {
  if (!lastSeen) return "offline";
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < ONLINE_THRESHOLD_MINUTES) return "online";
  if (mins < ONLINE_THRESHOLD_MINUTES * 6) return "idle";
  return "offline";
}
