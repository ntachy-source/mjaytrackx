import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdminDevice } from "@/hooks/useAdminDevices";
import type { Geofence } from "@/hooks/useGeofences";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useAdminGeofenceAlerts = (devices: AdminDevice[]) => {
  const { toast } = useToast();
  const insideMapRef = useRef<Map<string, Set<string>>>(new Map());
  const geofencesRef = useRef<Geofence[]>([]);

  const fetchAllGeofences = useCallback(async () => {
    const { data } = await supabase
      .from("geofences")
      .select("*");
    geofencesRef.current = (data as Geofence[]) || [];
  }, []);

  useEffect(() => {
    fetchAllGeofences();
  }, [fetchAllGeofences]);

  useEffect(() => {
    const geofences = geofencesRef.current;
    if (geofences.length === 0 || devices.length === 0) return;

    for (const fence of geofences) {
      if (!fence.is_active) continue;
      
      // Check ALL devices against this geofence (admin sees everything)
      for (const device of devices) {
        if (device.lat === 0 && device.lng === 0) continue;

        const distance = haversineDistance(device.lat, device.lng, fence.lat, fence.lng);
        const isInside = distance <= fence.radius_meters;

        const key = `${fence.id}`;
        if (!insideMapRef.current.has(key)) insideMapRef.current.set(key, new Set());
        const wasInside = insideMapRef.current.get(key)!.has(device.id);

        if (isInside && !wasInside) {
          insideMapRef.current.get(key)!.add(device.id);
          toast({
            title: "🚨 Geofence Breach",
            description: `${device.name} entered "${fence.name}" zone`,
          });
        } else if (!isInside && wasInside) {
          insideMapRef.current.get(key)!.delete(device.id);
          toast({
            title: "📍 Geofence Exit",
            description: `${device.name} left "${fence.name}" zone`,
            variant: "destructive",
          });
        }
      }
    }
  }, [devices, toast]);
};
