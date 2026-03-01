import { Geofence } from "@/hooks/useGeofences";
import { TrackedDevice } from "@/hooks/useDevices";
import { Shield, Trash2 } from "lucide-react";

interface GeofenceListProps {
  geofences: Geofence[];
  devices: TrackedDevice[];
  onDelete: (id: string) => Promise<void>;
}

const GeofenceList = ({ geofences, devices, onDelete }: GeofenceListProps) => {
  if (geofences.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground px-2 pt-2 flex items-center gap-1.5">
        <Shield className="w-3 h-3" /> Geofences
      </h3>
      {geofences.map((fence) => {
        const device = devices.find((d) => d.id === fence.device_id);
        return (
          <div key={fence.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-xs">
            <div className="w-2 h-2 rounded-full bg-primary/60" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate">{fence.name}</p>
              <p className="text-muted-foreground font-mono-data">
                {device?.name || "Unknown"} · {fence.radius_meters}m
              </p>
            </div>
            <button
              onClick={() => onDelete(fence.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default GeofenceList;
