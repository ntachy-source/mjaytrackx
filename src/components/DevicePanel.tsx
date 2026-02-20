import { motion, AnimatePresence } from "framer-motion";
import { Device } from "@/data/mockDevices";
import { Smartphone, Battery, MapPin, Clock, Zap } from "lucide-react";

interface DevicePanelProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
}

const statusColor = (s: Device["status"]) =>
  s === "online" ? "bg-online" : s === "idle" ? "bg-warning" : "bg-offline";

const formatTime = (d: Date) => {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const DevicePanel = ({ devices, selectedDevice, onSelectDevice }: DevicePanelProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-mono-data uppercase tracking-widest text-muted-foreground">
          Tracked Devices
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {devices.filter((d) => d.status === "online").length} / {devices.length} online
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                  <p className="text-xs text-muted-foreground font-mono-data">{device.userId}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Battery className="w-3 h-3" />
                  <span className="font-mono-data">{device.battery}%</span>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lat" value={selectedDevice.lat.toFixed(4)} />
                <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lng" value={selectedDevice.lng.toFixed(4)} />
                <InfoRow icon={<Zap className="w-3 h-3" />} label="Speed" value={`${selectedDevice.speed} km/h`} />
                <InfoRow icon={<Clock className="w-3 h-3" />} label="Seen" value={formatTime(selectedDevice.lastSeen)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-muted rounded p-2">
    <span className="text-primary">{icon}</span>
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto font-mono-data text-foreground">{value}</span>
  </div>
);

export default DevicePanel;
