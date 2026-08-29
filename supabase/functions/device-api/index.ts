// Device-facing API (v1) consumed by the native Android client.
// Base URL: https://<project-ref>.supabase.co/functions/v1/device-api
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, fail, json, rateLimit, segments, sha256 } from "../_shared/http.ts";

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function validTimestamp(ts: unknown): string | null {
  if (ts == null) return new Date().toISOString();
  if (typeof ts !== "string") return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  // reject future timestamps beyond 5 minutes clock skew, or older than 30 days
  const delta = d.getTime() - Date.now();
  if (delta > 5 * 60 * 1000) return null;
  if (-delta > 30 * 24 * 3600 * 1000) return null;
  return d.toISOString();
}

async function authenticate(req: Request) {
  const header = req.headers.get("x-device-token") ?? req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: fail(401, "missing_token", "Device token required") };
  const hash = await sha256(token);
  const db = admin();
  const { data: device } = await db
    .from("devices")
    .select("id, device_id, status, tracking_status")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!device) return { error: fail(401, "invalid_token", "Device token is invalid or revoked") };
  if (device.status !== "active") return { error: fail(403, "device_deactivated", "Device has been deactivated") };
  return { device, db };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const path = segments(req.url, "device-api");
  // tolerate /devices/... prefix so /api/v1/devices/location also works
  const route = path[0] === "devices" ? path.slice(1) : path;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    // ---------- POST /register ----------
    if (route[0] === "register" && req.method === "POST") {
      if (!rateLimit(`reg:${ip}`, 10, 60_000)) return fail(429, "rate_limited", "Too many registration attempts");
      const body = await req.json().catch(() => null);
      if (!body || typeof body.device_id !== "string" || body.device_id.length < 6 || body.device_id.length > 128)
        return fail(400, "invalid_request", "device_id is required (6-128 chars)");

      const db = admin();
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const token_hash = await sha256(token);

      const payload = {
        device_id: body.device_id,
        name: typeof body.device_name === "string" && body.device_name ? body.device_name : body.device_id,
        manufacturer: body.manufacturer ?? null,
        model: body.model ?? null,
        android_version: body.android_version ?? null,
        app_version: body.app_version ?? null,
        platform: "android",
        token_hash,
        last_seen: new Date().toISOString(),
      };

      const { data: existing } = await db.from("devices").select("id").eq("device_id", body.device_id).maybeSingle();
      let deviceRow;
      if (existing) {
        const { data, error } = await db.from("devices").update(payload).eq("id", existing.id).select("id").single();
        if (error) return fail(500, "db_error", error.message);
        deviceRow = data;
      } else {
        const { data, error } = await db.from("devices").insert(payload).select("id").single();
        if (error) return fail(500, "db_error", error.message);
        deviceRow = data;
      }

      await db.from("device_config").upsert({ device_id: deviceRow.id }, { onConflict: "device_id" });
      await db.from("audit_logs").insert({
        action: existing ? "device.re_registered" : "device.registered",
        device_id: deviceRow.id,
        metadata: { device_id: body.device_id, model: body.model ?? null },
      });

      return json({ success: true, device_id: body.device_id, device_token: token });
    }

    // Everything below requires device authentication
    const auth = await authenticate(req);
    if ("error" in auth) return auth.error;
    const { device, db } = auth;

    if (!rateLimit(`dev:${device.id}`, 120, 60_000))
      return fail(429, "rate_limited", "Too many requests, slow down");

    const touch = (extra: Record<string, unknown> = {}) =>
      db.from("devices").update({ last_seen: new Date().toISOString(), ...extra }).eq("id", device.id);

    // ---------- POST /location ----------
    if (route[0] === "location" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return fail(400, "invalid_json", "Malformed JSON body");

      const points = Array.isArray(body.locations) ? body.locations : [body];
      const rows: Record<string, unknown>[] = [];
      for (const p of points) {
        const lat = num(p.latitude), lng = num(p.longitude);
        if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180)
          return fail(400, "invalid_coordinates", "latitude/longitude out of range");
        const ts = validTimestamp(p.timestamp);
        if (!ts) return fail(400, "invalid_timestamp", "timestamp must be ISO-8601, not in the future, max 30 days old");
        rows.push({
          device_id: device.id,
          lat, lng,
          accuracy: num(p.accuracy),
          altitude: num(p.altitude),
          speed: num(p.speed) ?? 0,
          bearing: num(p.bearing),
          battery: num(p.battery_level),
          timestamp: ts,
        });
      }
      if (rows.length > 500) return fail(400, "batch_too_large", "Maximum 500 locations per request");

      const { error } = await db.from("locations").insert(rows);
      if (error) return fail(500, "db_error", error.message);

      const latestBattery = num(points[points.length - 1]?.battery_level);
      await touch(latestBattery !== null ? { battery_level: latestBattery } : {});
      return json({ success: true, accepted: rows.length, received_at: new Date().toISOString() });
    }

    // ---------- POST /status ----------
    if (route[0] === "status" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return fail(400, "invalid_json", "Malformed JSON body");
      const update: Record<string, unknown> = {};
      if (num(body.battery_level) !== null) update.battery_level = num(body.battery_level);
      if (typeof body.is_charging === "boolean") update.is_charging = body.is_charging;
      if (body.location_permission !== undefined)
        update.location_permission_status = String(body.location_permission);
      if (typeof body.tracking_enabled === "boolean") update.tracking_status = body.tracking_enabled;
      if (typeof body.app_version === "string") update.app_version = body.app_version;
      if (typeof body.android_version === "string") update.android_version = body.android_version;
      if (typeof body.network_type === "string") update.network_type = body.network_type;
      const { error } = await touch(update);
      if (error) return fail(500, "db_error", error.message);
      return json({ success: true, received_at: new Date().toISOString() });
    }

    // ---------- GET /config ----------
    if (route[0] === "config" && req.method === "GET") {
      let { data: cfg } = await db.from("device_config").select("*").eq("device_id", device.id).maybeSingle();
      if (!cfg) {
        const { data } = await db.from("device_config").insert({ device_id: device.id }).select("*").single();
        cfg = data;
      }
      await touch();
      return json({
        success: true,
        tracking_enabled: cfg?.tracking_enabled ?? true,
        tracking_interval: cfg?.tracking_interval ?? 60,
        distance_filter: cfg?.distance_filter ?? 20,
        updated_at: cfg?.updated_at ?? null,
      });
    }

    // ---------- GET /commands ----------
    if (route[0] === "commands" && route.length === 1 && req.method === "GET") {
      const { data, error } = await db
        .from("commands")
        .select("id, command, payload, created_at")
        .eq("device_id", device.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) return fail(500, "db_error", error.message);
      const ids = (data ?? []).map((c) => c.id);
      if (ids.length)
        await db.from("commands").update({ status: "sent", sent_at: new Date().toISOString() }).in("id", ids);
      await touch();
      return json({ success: true, commands: data ?? [] });
    }

    // ---------- POST /commands/{id}/ack ----------
    if (route[0] === "commands" && route[2] === "ack" && req.method === "POST") {
      const commandId = route[1];
      const body = await req.json().catch(() => ({}));
      const status = ["completed", "failed"].includes(body?.status) ? body.status : "completed";
      const { data, error } = await db
        .from("commands")
        .update({ status, result: typeof body?.result === "string" ? body.result : null, acknowledged_at: new Date().toISOString() })
        .eq("id", commandId)
        .eq("device_id", device.id)
        .select("id")
        .maybeSingle();
      if (error) return fail(500, "db_error", error.message);
      if (!data) return fail(404, "command_not_found", "No such command for this device");
      await touch();
      return json({ success: true, id: commandId, status });
    }

    return fail(404, "not_found", `Unknown endpoint: /${route.join("/")}`);
  } catch (e) {
    return fail(500, "server_error", (e as Error).message);
  }
});
