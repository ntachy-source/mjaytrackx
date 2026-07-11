import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrackedDevice } from "@/hooks/useDevices";
import { Geofence } from "@/hooks/useGeofences";
import { Smartphone, Battery, MapPin, Clock, Zap, Trash2, Hash, Phone, Link, CheckCircle, Pencil } from "lucide-react";
import AddDeviceDialog from "./AddDeviceDialog";
import EditDeviceDialog from "./EditDeviceDialog";
import AddGeofenceDialog from "./AddGeofenceDialog";
import GeofenceList from "./GeofenceList";
import TrackingControls from "./TrackingControls";

interface DevicePanelProps {
  devices: TrackedDevice[];
  selectedDevice: TrackedDevice | null;
  onSelectDevice: (device: TrackedDevice) => void;
  onAddDevice: (name: string, imei?: string, phoneNumber?: string) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  onUpdateDevice: (id: string, updates: { name?: string; imei?: string | null; phoneNumber?: string | null }) => Promise<void>;
  onGenerateShareToken: (deviceId: string) => Promise<string | null>;
  geofences: Geofence[];
  onAddGeofence: (deviceId: string, name: string, lat: number, lng: number, radius: number) => Promise<void>;
  onDeleteGeofence: (id: string) => Promise<void>;
  following: boolean;
  onToggleFollow: () => void;
  loading: boolean;
}

const statusColor = (s: TrackedDevice["status"]) =>
  s === "online" ? "bg-online" : s === "idle" ? "bg-warning" : "bg-offline";

const formatTime = (d: Date) => {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const DevicePanel = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onAddDevice,
  onDeleteDevice,
  onUpdateDevice,
  onGenerateShareToken,
  geofences,
  onAddGeofence,
  onDeleteGeofence,
  following,
  onToggleFollow,
  loading,
}: DevicePanelProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editDevice, setEditDevice] = useState<TrackedDevice | null>(null);

  const handleShareLink = async (device: TrackedDevice) => {
    let token = device.shareToken;
    if (!token) {
      setGenerating(true);
      token = await onGenerateShareToken(device.id);
      setGenerating(false);
    }
    if (token) {
      const url = `${window.location.origin}/track/${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(device.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-mono-data uppercase tracking-widest text-muted-foreground">
          Your Devices
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {devices.filter((d) => d.status === "online").length} / {devices.length} online
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">
            Loading...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">
            No devices registered yet
          </div>
        ) : (
          <AnimatePresence>
            {devices.map((device) => (
              <motion.button
                key={device.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelectDevice(device)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedDevice?.id === device.id
                    ? "bg-accent/20 border-glow border"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor(device.status)} border-2 border-background`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{device.name}</p>
                    <p className="text-xs text-muted-foreground font-mono-data">
                      {formatTime(device.lastSeen)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.battery > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Battery className="w-3 h-3" />
                        <span className="font-mono-data">{device.battery}%</span>
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDevice(device);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                      title="Edit device"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDevice(device.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
        <div className="pt-2 space-y-2">
          <AddDeviceDialog onAdd={onAddDevice} />
          <AddGeofenceDialog devices={devices} onAdd={onAddGeofence} />
        </div>
        <GeofenceList geofences={geofences} devices={devices} onDelete={onDeleteGeofence} />
      </div>

      {/* Device detail */}
      <AnimatePresence>
        {selectedDevice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-mono-data uppercase tracking-widest text-primary text-glow">
                Device Intel
              </h3>
              {selectedDevice.status === "offline" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs text-destructive font-mono-data">
                    OFFLINE — Last known position shown
                  </span>
                </div>
              )}
              {selectedDevice.status === "idle" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <span className="text-xs text-warning font-mono-data">
                    IDLE — No updates recently
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lat" value={selectedDevice.lat.toFixed(4)} />
                <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lng" value={selectedDevice.lng.toFixed(4)} />
                <InfoRow icon={<Zap className="w-3 h-3" />} label="Speed" value={`${selectedDevice.speed} km/h`} />
                <InfoRow icon={<Clock className="w-3 h-3" />} label="Seen" value={formatTime(selectedDevice.lastSeen)} />
                {selectedDevice.imei && (
                  <InfoRow icon={<Hash className="w-3 h-3" />} label="IMEI" value={selectedDevice.imei} />
                )}
                {selectedDevice.phoneNumber && (
                  <InfoRow icon={<Phone className="w-3 h-3" />} label="Phone" value={selectedDevice.phoneNumber} />
                )}
              </div>
              {/* Share tracking link button */}
              <button
                onClick={() => handleShareLink(selectedDevice)}
                disabled={generating}
                className="w-full mt-2 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-mono-data flex items-center justify-center gap-2 hover:bg-accent/80 transition-colors"
              >
                {copiedId === selectedDevice.id ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> LINK COPIED!
                  </>
                ) : generating ? (
                  <>GENERATING...</>
                ) : (
                  <>
                    <Link className="w-3.5 h-3.5" /> SHARE TRACKING LINK
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TrackingControls device={selectedDevice} following={following} onToggleFollow={onToggleFollow} />
      <EditDeviceDialog
        device={editDevice}
        open={!!editDevice}
        onOpenChange={(o) => !o && setEditDevice(null)}
        onSave={onUpdateDevice}
      />
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-muted rounded p-2">
    <span className="text-primary">{icon}</span>
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto font-mono-data text-foreground truncate">{value}</span>
  </div>
);

export default DevicePanel;
