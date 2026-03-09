import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useAdminDevices, AdminDevice } from "@/hooks/useAdminDevices";
import { Navigate } from "react-router-dom";
import TrackerMap from "@/components/TrackerMap";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone, Battery, MapPin, Clock, Zap, Hash, Phone, Shield,
  Wifi, WifiOff, ChevronRight, LogOut, Lock, Unlock, Volume2, Activity,
  BarChart3, History, MessageSquare,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { TrackedDevice } from "@/hooks/useDevices";
import AdminStatsBar from "@/components/admin/AdminStatsBar";
import DeviceSearchFilter, { type StatusFilter } from "@/components/admin/DeviceSearchFilter";
import BulkActionBar from "@/components/admin/BulkActionBar";
import AdminActivityLog from "@/components/admin/AdminActivityLog";
import DeviceAnalytics from "@/components/admin/DeviceAnalytics";
import HistoryPlayback from "@/components/admin/HistoryPlayback";
import { useAdminGeofenceAlerts } from "@/components/admin/AdminGeofenceAlerts";
import AdminDeviceDetail from "@/components/admin/AdminDeviceDetail";

const statusColor = (s: TrackedDevice["status"]) =>
  s === "online" ? "bg-green-500" : s === "idle" ? "bg-yellow-500" : "bg-red-500";

const statusText = (s: TrackedDevice["status"]) =>
  s === "online" ? "text-green-400" : s === "idle" ? "text-yellow-400" : "text-red-400";

const Admin = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const { devices, loading, refetch } = useAdminDevices();
  const [selectedDevice, setSelectedDevice] = useState<TrackedDevice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [locking, setLocking] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showLog, setShowLog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);
  const { toast } = useToast();

  // Geofence breach alerts for admin
  useAdminGeofenceAlerts(devices);

  const filteredDevices = useMemo(() => {
    let filtered = devices;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d as AdminDevice).ownerEmail?.toLowerCase().includes(q) ||
          d.imei?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      if (statusFilter === "locked") {
        filtered = filtered.filter((d) => (d as AdminDevice).isLocked);
      } else {
        filtered = filtered.filter((d) => d.status === statusFilter);
      }
    }
    return filtered;
  }, [devices, search, statusFilter]);

  const handleSelectDevice = useCallback((device: TrackedDevice) => {
    setSelectedDevice((prev) => (prev?.id === device.id ? null : device));
    setShowPlayback(false);
  }, []);

  const toggleBulkSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const logAction = useCallback(
    async (action: string, device: AdminDevice, details?: string) => {
      await supabase.from("admin_activity_logs").insert({
        admin_user_id: user!.id,
        action,
        target_device_id: device.id,
        target_device_name: device.name,
        details,
      });
    },
    [user]
  );

  const handleToggleLock = useCallback(
    async (device: AdminDevice, lock: boolean) => {
      setLocking(true);
      const { error } = await supabase
        .from("devices")
        .update({ is_locked: lock })
        .eq("id", device.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: lock ? "Device Locked" : "Device Unlocked" });
        await logAction(lock ? "lock" : "unlock", device);
        refetch();
      }
      setLocking(false);
    },
    [toast, refetch, logAction]
  );

  const handleToggleAlarm = useCallback(
    async (device: AdminDevice, alarm: boolean) => {
      const { error } = await supabase
        .from("devices")
        .update({ play_alarm: alarm })
        .eq("id", device.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: alarm ? "Alarm Enabled" : "Alarm Disabled" });
        await logAction(alarm ? "alarm_on" : "alarm_off", device);
        refetch();
      }
    },
    [toast, refetch, logAction]
  );

  const handleUpdateLockMessage = useCallback(
    async (device: AdminDevice, message: string) => {
      const { error } = await supabase
        .from("devices")
        .update({ lock_message: message })
        .eq("id", device.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Lock message updated" });
        await logAction("lock_message_update", device, message);
        refetch();
      }
    },
    [toast, refetch, logAction]
  );

  const bulkAction = useCallback(
    async (action: "lock" | "unlock" | "alarm_on" | "alarm_off") => {
      setLocking(true);
      const ids = Array.from(selectedIds);
      const update =
        action === "lock"
          ? { is_locked: true }
          : action === "unlock"
          ? { is_locked: false, play_alarm: false }
          : action === "alarm_on"
          ? { play_alarm: true }
          : { play_alarm: false };

      for (const id of ids) {
        await supabase.from("devices").update(update).eq("id", id);
        const dev = devices.find((d) => d.id === id) as AdminDevice | undefined;
        if (dev) await logAction(action, dev, `Bulk action on ${ids.length} devices`);
      }

      toast({ title: `Bulk ${action.replace("_", " ")} completed`, description: `${ids.length} devices affected.` });
      setSelectedIds(new Set());
      refetch();
      setLocking(false);
    },
    [selectedIds, devices, toast, refetch, logAction]
  );

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

  return (
    <div className="relative h-screen w-screen bg-background overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <TrackerMap
          devices={filteredDevices}
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
          <div className="flex items-center gap-1 text-xs font-mono-data">
            <button
              onClick={() => { setShowAnalytics(!showAnalytics); setShowLog(false); }}
              className={`p-1.5 transition-colors rounded ${showAnalytics ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowLog(!showLog); setShowAnalytics(false); }}
              className={`p-1.5 transition-colors rounded ${showLog ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
              title="Activity Log"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button onClick={signOut} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="absolute top-12 left-3 right-3 z-20 py-2">
        <AdminStatsBar devices={devices} />
      </div>

      {/* Device list panel */}
      <div className="absolute top-[6.5rem] left-3 bottom-3 z-20 w-80 bg-card/90 backdrop-blur-md border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <h2 className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground">
            All Devices ({filteredDevices.length})
          </h2>
          <DeviceSearchFilter
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">Loading...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm font-mono-data">No devices found</div>
          ) : (
            <AnimatePresence>
              {filteredDevices.map((device) => {
                const adminDev = device as AdminDevice;
                const isSelected = selectedIds.has(device.id);
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-2 ${
                      syncedSelected?.id === device.id
                        ? "bg-accent/20 border-glow border"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleBulkSelect(device.id)}
                      className="shrink-0"
                    />
                    <button
                      onClick={() => handleSelectDevice(device)}
                      className="flex-1 flex items-center gap-3 min-w-0"
                    >
                      <div className="relative">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor(device.status)} border-2 border-background`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate text-left">
                          {device.name}
                          {adminDev.isLocked && (
                            <Lock className="w-3 h-3 text-destructive inline ml-1.5" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono-data truncate text-left">
                          {adminDev.ownerEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono-data ${statusText(device.status)} uppercase`}>
                          {device.status}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Bulk actions */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          onLockAll={() => bulkAction("lock")}
          onUnlockAll={() => bulkAction("unlock")}
          onAlarmAll={() => bulkAction("alarm_on")}
          onAlarmOffAll={() => bulkAction("alarm_off")}
          onClearSelection={() => setSelectedIds(new Set())}
          disabled={locking}
        />

        {/* Device detail */}
        <AnimatePresence>
          {syncedSelected && (
            <AdminDeviceDetail
              device={syncedSelected as AdminDevice}
              locking={locking}
              onToggleLock={handleToggleLock}
              onToggleAlarm={handleToggleAlarm}
              onUpdateLockMessage={handleUpdateLockMessage}
              onPlayHistory={() => setShowPlayback(true)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* History Playback */}
      <AnimatePresence>
        {showPlayback && syncedSelected && syncedSelected.history.length > 1 && (
          <HistoryPlayback
            history={syncedSelected.history}
            deviceName={syncedSelected.name}
            onPositionChange={() => {}}
            onClose={() => setShowPlayback(false)}
          />
        )}
      </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <DeviceAnalytics devices={devices} isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
        )}
      </AnimatePresence>

      {/* Activity Log Panel */}
      <AnimatePresence>
        {showLog && <AdminActivityLog isOpen={showLog} onClose={() => setShowLog(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
