import { Navigation, Eye, EyeOff } from "lucide-react";
import { TrackedDevice } from "@/hooks/useDevices";

interface TrackingControlsProps {
  device: TrackedDevice | null;
  following: boolean;
  onToggleFollow: () => void;
}

const TrackingControls = ({ device, following, onToggleFollow }: TrackingControlsProps) => {
  if (!device) return null;

  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={onToggleFollow}
        className={`w-full py-2.5 rounded-lg font-mono-data text-sm flex items-center justify-center gap-2 transition-all ${
          following
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground glow-primary"
        }`}
      >
        {following ? (
          <>
            <EyeOff className="w-4 h-4" /> STOP FOLLOWING
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" /> LIVE FOLLOW DEVICE
          </>
        )}
      </button>
    </div>
  );
};

export default TrackingControls;
