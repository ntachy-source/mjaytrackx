import { useState, useEffect, useRef } from "react";
import { Navigation, Pause, Play } from "lucide-react";
import { TrackedDevice } from "@/hooks/useDevices";
import { useToast } from "@/hooks/use-toast";

interface TrackingControlsProps {
  device: TrackedDevice | null;
  onSendLocation: (deviceId: string, lat: number, lng: number, speed?: number) => Promise<void>;
}

const TrackingControls = ({ device, onSendLocation }: TrackingControlsProps) => {
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  const startTracking = () => {
    if (!device) return;
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }

    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        onSendLocation(
          device.id,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed ? pos.coords.speed * 3.6 : 0
        );
      },
      (err) => {
        toast({ title: "Location error", description: err.message, variant: "destructive" });
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  useEffect(() => {
    return () => stopTracking();
  }, []);

  if (!device) return null;

  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={tracking ? stopTracking : startTracking}
        className={`w-full py-2.5 rounded-lg font-mono-data text-sm flex items-center justify-center gap-2 transition-all ${
          tracking
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground glow-primary"
        }`}
      >
        {tracking ? (
          <>
            <Pause className="w-4 h-4" /> STOP TRACKING
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" /> START GPS TRACKING
          </>
        )}
      </button>
    </div>
  );
};

export default TrackingControls;
