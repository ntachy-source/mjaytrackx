import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TrackedDevice, DeviceRow, LocationRow } from "@/hooks/useDevices";

export interface AdminDevice extends TrackedDevice {
  ownerEmail?: string;
  userId: string;
}

export const useAdminDevices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllDevices = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: deviceRows, error: devErr } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });

    if (devErr) {
      toast({ title: "Error loading devices", description: devErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch profiles for owner names
    const userIds = [...new Set((deviceRows as DeviceRow[]).map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name");

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.user_id, p.display_name || "Unknown");
    });

    const adminDevices: AdminDevice[] = [];
    for (const dev of (deviceRows as DeviceRow[]) || []) {
      const { data: locations } = await supabase
        .from("locations")
        .select("*")
        .eq("device_id", dev.id)
        .order("timestamp", { ascending: false })
        .limit(50);

      const locs = (locations as LocationRow[]) || [];
      const latest = locs[0];
      const now = Date.now();
      const lastSeen = latest ? new Date(latest.timestamp) : new Date(dev.created_at);
      const minsAgo = (now - lastSeen.getTime()) / 60000;

      adminDevices.push({
        id: dev.id,
        name: dev.name,
        imei: dev.imei,
        phoneNumber: dev.phone_number,
        shareToken: (dev as any).share_token ?? null,
        lat: latest?.lat ?? 0,
        lng: latest?.lng ?? 0,
        battery: latest?.battery ?? 100,
        speed: latest?.speed ?? 0,
        status: minsAgo < 5 ? "online" : minsAgo < 30 ? "idle" : "offline",
        lastSeen,
        history: locs.reverse().map((l) => ({
          lat: l.lat,
          lng: l.lng,
          timestamp: new Date(l.timestamp),
        })),
        userId: dev.user_id,
        ownerEmail: profileMap.get(dev.user_id) || dev.user_id,
      });
    }

    setDevices(adminDevices);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    fetchAllDevices();

    const channel = supabase
      .channel("admin-locations-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "locations" },
        () => fetchAllDevices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAllDevices]);

  return { devices, loading, refetch: fetchAllDevices };
};
