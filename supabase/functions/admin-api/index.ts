// Admin API (v1) — authenticated with an admin user's access token.
// Base URL: https://<project-ref>.supabase.co/functions/v1/admin-api
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeStatus, corsHeaders, fail, json, rateLimit, segments } from "../_shared/http.ts";

const service = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const WRITE_ROLES = ["admin", "super_admin"];

async function authenticate(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: fail(401, "missing_token", "Authorization: Bearer <access_token> required") };
  const db = service();
  const { data: userData, error } = await db.auth.getUser(token);
  if (error || !userData?.user) return { error: fail(401, "invalid_token", "Invalid or expired access token") };
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", userData.user.id);
  const roleList = (roles ?? []).map((r) => r.role as string);
  if (!roleList.some((r) => [...WRITE_ROLES, "viewer"].includes(r)))
    return { error: fail(403, "forbidden", "Account has no dashboard role") };
  return { db, user: userData.user, roles: roleList };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticate(req);
  if ("error" in auth) return auth.error;
  const { db, user, roles } = auth;
  const canWrite = roles.some((r) => WRITE_ROLES.includes(r));
  const isSuper = roles.includes("super_admin");

  if (!rateLimit(`admin:${user.id}`, 300, 60_000)) return fail(429, "rate_limited", "Too many requests");

  const path = segments(req.url, "admin-api");
  const route = path[0] === "admin" ? path.slice(1) : path;
  const url = new URL(req.url);

  // scope: super_admin sees everything; admin/viewer see devices they own or all if admin role
  const scoped = <T extends { eq: (c: string, v: unknown) => T }>(q: T) =>
    isSuper || roles.includes("admin") ? q : q.eq("user_id", user.id);

  const audit = (action: string, device_id: string | null, metadata: Record<string, unknown> = {}) =>
    db.from("audit_logs").insert({ admin_id: user.id, action, device_id, metadata });

  try {
    // GET /devices
    if (route[0] === "devices" && route.length === 1 && req.method === "GET") {
      const { data, error } = await scoped(db.from("devices").select("*").order("last_seen", { ascending: false }) as never);
      if (error) return fail(500, "db_error", error.message);
      return json({
        success: true,
        devices: (data ?? []).map((d: Record<string, unknown>) => ({ ...d, token_hash: undefined, online_status: computeStatus(d.last_seen as string | null) })),
      });
    }

    const deviceId = route[1];
    if (route[0] === "devices" && deviceId) {
      const { data: device } = await db.from("devices").select("*").eq("id", deviceId).maybeSingle();
      if (!device) return fail(404, "device_not_found", "Device not found");
      if (!isSuper && !roles.includes("admin") && device.user_id !== user.id)
        return fail(403, "forbidden", "Not authorized for this device");

      // GET /devices/{id}
      if (route.length === 2 && req.method === "GET") {
        const { data: cfg } = await db.from("device_config").select("*").eq("device_id", deviceId).maybeSingle();
        return json({ success: true, device: { ...device, token_hash: undefined, online_status: computeStatus(device.last_seen) }, config: cfg });
      }

      // PATCH /devices/{id}
      if (route.length === 2 && req.method === "PATCH") {
        if (!canWrite) return fail(403, "forbidden", "Write access required");
        const body = await req.json().catch(() => ({}));
        const allowed = ["name", "status", "tracking_status", "user_id"] as const;
        const update: Record<string, unknown> = {};
        for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
        if (!Object.keys(update).length) return fail(400, "invalid_request", "No updatable fields provided");
        const { error } = await db.from("devices").update(update).eq("id", deviceId);
        if (error) return fail(500, "db_error", error.message);
        await audit("device.updated", deviceId, update);
        return json({ success: true });
      }

      // GET /devices/{id}/location
      if (route[2] === "location" && req.method === "GET") {
        const { data } = await db
          .from("locations").select("*").eq("device_id", deviceId)
          .order("timestamp", { ascending: false }).limit(1).maybeSingle();
        return json({ success: true, location: data ?? null });
      }

      // GET /devices/{id}/history?start=&end=&limit=&offset=
      if (route[2] === "history" && req.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 5000);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        let q = db.from("locations").select("*", { count: "exact" }).eq("device_id", deviceId);
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        if (start) q = q.gte("timestamp", start);
        if (end) q = q.lte("timestamp", end);
        const { data, count, error } = await q.order("timestamp", { ascending: true }).range(offset, offset + limit - 1);
        if (error) return fail(500, "db_error", error.message);
        return json({ success: true, total: count ?? 0, limit, offset, locations: data ?? [] });
      }

      // PATCH /devices/{id}/config
      if (route[2] === "config" && req.method === "PATCH") {
        if (!canWrite) return fail(403, "forbidden", "Write access required");
        const body = await req.json().catch(() => ({}));
        const update: Record<string, unknown> = { device_id: deviceId, updated_at: new Date().toISOString() };
        if (typeof body.tracking_enabled === "boolean") update.tracking_enabled = body.tracking_enabled;
        if (Number.isInteger(body.tracking_interval) && body.tracking_interval >= 5) update.tracking_interval = body.tracking_interval;
        if (Number.isInteger(body.distance_filter) && body.distance_filter >= 0) update.distance_filter = body.distance_filter;
        const { error } = await db.from("device_config").upsert(update, { onConflict: "device_id" });
        if (error) return fail(500, "db_error", error.message);
        await audit("device.config_updated", deviceId, update);
        return json({ success: true, config: update });
      }

      // GET/POST /devices/{id}/commands
      if (route[2] === "commands") {
        if (req.method === "GET") {
          const { data } = await db.from("commands").select("*").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(200);
          return json({ success: true, commands: data ?? [] });
        }
        if (req.method === "POST") {
          if (!canWrite) return fail(403, "forbidden", "Write access required");
          const body = await req.json().catch(() => ({}));
          if (typeof body.command !== "string" || !body.command)
            return fail(400, "invalid_request", "command is required");
          const { data, error } = await db.from("commands").insert({
            device_id: deviceId,
            command: body.command,
            payload: body.payload ?? {},
            created_by: user.id,
          }).select("*").single();
          if (error) return fail(500, "db_error", error.message);
          await audit("command.created", deviceId, { command: body.command });
          return json({ success: true, command: data }, 201);
        }
      }
    }

    // GET /audit-logs
    if (route[0] === "audit-logs" && req.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
      const { data, error } = await db.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(limit);
      if (error) return fail(500, "db_error", error.message);
      return json({ success: true, logs: data ?? [] });
    }

    return fail(404, "not_found", `Unknown endpoint: /${route.join("/")}`);
  } catch (e) {
    return fail(500, "server_error", (e as Error).message);
  }
});
