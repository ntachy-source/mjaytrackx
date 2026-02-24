import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DeviceRow {
  id: string;
  user_id: string;
  name: string;
  imei: string | null;
  phone_number: string | null;
  created_at: string;
}

export interface LocationRow {
  id: string;
  device_id: string;
  lat: number;
  lng: number;
  speed: number | null;
  battery: number | null;
  timestamp: string;
}

export interface TrackedDevice {
  id: string;
  name: string;
  imei: string | null;
  phoneNumber: string | null;
  shareToken: string | null;
  lat: number;
  lng: number;
  battery: number;
  speed: number;
  status: "online" | "offline" | "idle";
  lastSeen: Date;
  history: { lat: number; lng: number; timestamp: Date }[];
}

export const useDevices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<TrackedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
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

    const trackedDevices: TrackedDevice[] = [];
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

      trackedDevices.push({
        id: dev.id,
        name: dev.name,
        imei: dev.imei,
        phoneNumber: dev.phone_number,
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
      });
    }

    setDevices(trackedDevices);
    setLoading(false);
  }, [user, toast]);

  const addDevice = async (name: string, imei?: string, phoneNumber?: string) => {
    if (!user) return;
    const { error } = await supabase.from("devices").insert({
      name,
      user_id: user.id,
      imei: imei || null,
      phone_number: phoneNumber || null,
    });
    if (error) {
      toast({ title: "Error adding device", description: error.message, variant: "destructive" });
    } else {
      await fetchDevices();
    }
  };

  const deleteDevice = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await fetchDevices();
    }
  };

  const sendLocation = async (deviceId: string, lat: number, lng: number, speed?: number, battery?: number) => {
    const { error } = await supabase.from("locations").insert({
      device_id: deviceId,
      lat,
      lng,
      speed: speed ?? 0,
      battery: battery ?? null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    fetchDevices();

    const channel = supabase
      .channel("locations-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "locations" },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDevices]);

  return { devices, loading, addDevice, deleteDevice, sendLocation, refetch: fetchDevices };
};
