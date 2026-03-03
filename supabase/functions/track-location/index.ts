import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, lat, lng, speed, battery } = await req.json();

    if (!token || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "Missing token, lat, or lng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up device by share_token, include lock status
    const { data: device, error: devErr } = await supabase
      .from("devices")
      .select("id, is_locked, lock_message, play_alarm")
      .eq("share_token", token)
      .maybeSingle();

    if (devErr || !device) {
      return new Response(
        JSON.stringify({ error: "Invalid tracking link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert location even if locked (so admin can still see position)
    const { error: locErr } = await supabase.from("locations").insert({
      device_id: device.id,
      lat,
      lng,
      speed: speed ?? 0,
      battery: battery ?? null,
    });

    if (locErr) {
      return new Response(
        JSON.stringify({ error: locErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        is_locked: device.is_locked,
        lock_message: device.lock_message,
        play_alarm: device.play_alarm,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
