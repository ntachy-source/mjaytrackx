import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useAdminDevices, AdminDevice } from "@/hooks/useAdminDevices";
import { Navigate } from "react-router-dom";
import TrackerMap from "@/components/TrackerMap";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone, Battery, MapPin, Clock, Zap, Hash, Phone, Shield,
  Users, Wifi, WifiOff, ChevronRight, LogOut,
} from "lucide-react";
import type { TrackedDevice } from "@/hooks/useDevices";

const statusColor = (s: TrackedDevice["status"]) =>
  s === "online" ? "bg-online" : s === "idle" ? "bg-warning" : "bg-offline";

const statusText = (s: TrackedDevice["status"]) =>
  s === "online" ? "text-green-400" : s === "idle" ? "text-yellow-400" : "text-red-400";

const formatTime = (d: Date) => {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const { devices, loading } = useAdminDevices();
  const [selectedDevice, setSelectedDevice] = useState<TrackedDevice | null>(null);

  const handleSelectDevice = useCallback((device: TrackedDevice) => {
    setSelectedDevice((prev) => (prev?.id === device.id ? null : device));
  }, []);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono-data text-glow">LOADING ADMIN...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const syncedSelected = selectedDevice
    ? devices.find((d) => d.id === selectedDevice.id) ?? null
    : null;

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const idleCount = devices.filter((d) => d.status === "idle").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;

  return (
    <div className="relative h-screen w-screen bg-background overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <TrackerMap
          devices={devices}
          selectedDevice={syncedSelected}
          onSelectDevice={handleSelectDevice}
        />
      </div>

      {/* Admin header bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 py-2">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary text-glow" />
            <span className="text-sm font-bold text-foreground tracking-tight">
              TRACK<span className="text-primary">X</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono-data">ADMIN</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono-data">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">{devices.length}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">{onlineCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">{offlineCount}</span>
            </span>
            <button onClick={signOut} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Device list panel */}
      <div className="absolute top-12 left-3 bottom-3 z-20 w-80 bg-card/90 backdrop-blur-md border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground">
            All Devices
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">No devices found</div>
          ) : (
            <AnimatePresence>
              {devices.map((device) => (
                <motion.button
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleSelectDevice(device)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    syncedSelected?.id === device.id
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
                      <p className="text-xs text-muted-foreground font-mono-data truncate">
                        {(device as AdminDevice).ownerEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono-data ${statusText(device.status)} uppercase`}>
                        {device.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Device detail */}
        <AnimatePresence>
          {syncedSelected && (
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
                  <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lat" value={syncedSelected.lat.toFixed(4)} />
                  <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lng" value={syncedSelected.lng.toFixed(4)} />
                  <InfoRow icon={<Zap className="w-3 h-3" />} label="Speed" value={`${syncedSelected.speed} km/h`} />
                  <InfoRow icon={<Battery className="w-3 h-3" />} label="Battery" value={`${syncedSelected.battery}%`} />
                  <InfoRow icon={<Clock className="w-3 h-3" />} label="Seen" value={formatTime(syncedSelected.lastSeen)} />
                  {syncedSelected.imei && (
                    <InfoRow icon={<Hash className="w-3 h-3" />} label="IMEI" value={syncedSelected.imei} />
                  )}
                  {syncedSelected.phoneNumber && (
                    <InfoRow icon={<Phone className="w-3 h-3" />} label="Phone" value={syncedSelected.phoneNumber} />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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

export default Admin;
