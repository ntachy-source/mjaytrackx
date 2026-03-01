import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { TrackedDevice } from "@/hooks/useDevices";

export interface Geofence {
  id: string;
  device_id: string;
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

// Track which devices are inside which geofences
const insideMap = new Map<string, Set<string>>(); // geofenceId -> Set<deviceId>

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useGeofences = (devices: TrackedDevice[]) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notify } = usePushNotifications();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGeofences = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("geofences")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading geofences", description: error.message, variant: "destructive" });
    } else {
      setGeofences((data as Geofence[]) || []);
    }
    setLoading(false);
  }, [user, toast]);

  const addGeofence = async (deviceId: string, name: string, lat: number, lng: number, radiusMeters: number) => {
    if (!user) return;
    const { error } = await supabase.from("geofences").insert({
      device_id: deviceId,
      user_id: user.id,
      name,
      lat,
      lng,
      radius_meters: radiusMeters,
    } as any);
    if (error) {
      toast({ title: "Error adding geofence", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Geofence created", description: `"${name}" zone added.` });
      await fetchGeofences();
    }
  };

  const deleteGeofence = async (id: string) => {
    const { error } = await supabase.from("geofences").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      insideMap.delete(id);
      await fetchGeofences();
    }
  };

  // Check devices against geofences
  useEffect(() => {
    if (geofences.length === 0 || devices.length === 0) return;

    for (const fence of geofences) {
      if (!fence.is_active) continue;
      const device = devices.find((d) => d.id === fence.device_id);
      if (!device || (device.lat === 0 && device.lng === 0)) continue;

      const distance = haversineDistance(device.lat, device.lng, fence.lat, fence.lng);
      const isInside = distance <= fence.radius_meters;

      if (!insideMap.has(fence.id)) insideMap.set(fence.id, new Set());
      const wasInside = insideMap.get(fence.id)!.has(device.id);

      if (isInside && !wasInside) {
        insideMap.get(fence.id)!.add(device.id);
        const msg = `${device.name} entered "${fence.name}" zone`;
        toast({ title: "Geofence Alert", description: msg });
        notify(msg, { body: `Device is now inside the ${fence.name} area.`, tag: `geo-enter-${fence.id}` });
      } else if (!isInside && wasInside) {
        insideMap.get(fence.id)!.delete(device.id);
        const msg = `${device.name} left "${fence.name}" zone`;
        toast({ title: "Geofence Alert", description: msg, variant: "destructive" });
        notify(msg, { body: `Device has left the ${fence.name} area.`, tag: `geo-exit-${fence.id}` });
      }
    }
  }, [devices, geofences, toast, notify]);

  useEffect(() => {
    if (!user) return;
    fetchGeofences();
  }, [user, fetchGeofences]);

  return { geofences, loading, addGeofence, deleteGeofence, refetchGeofences: fetchGeofences };
};
