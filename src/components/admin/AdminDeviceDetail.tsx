import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Clock, Zap, Battery, Hash, Phone, Lock, Unlock, Volume2,
  History, MessageSquare, Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { AdminDevice } from "@/hooks/useAdminDevices";

interface AdminDeviceDetailProps {
  device: AdminDevice;
  locking: boolean;
  onToggleLock: (device: AdminDevice, lock: boolean) => void;
  onToggleAlarm: (device: AdminDevice, alarm: boolean) => void;
  onUpdateLockMessage: (device: AdminDevice, message: string) => void;
  onPlayHistory: () => void;
}

const formatTime = (d: Date) => {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 bg-muted rounded p-2">
    <span className="text-primary">{icon}</span>
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto font-mono-data text-foreground truncate">{value}</span>
  </div>
);

const AdminDeviceDetail = ({
  device,
  locking,
  onToggleLock,
  onToggleAlarm,
  onUpdateLockMessage,
  onPlayHistory,
}: AdminDeviceDetailProps) => {
  const [lockMsg, setLockMsg] = useState(device.lockMessage || "");
  const [msgDirty, setMsgDirty] = useState(false);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-border overflow-hidden"
    >
      <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono-data uppercase tracking-widest text-primary text-glow">
            Device Intel
          </h3>
          {device.history.length > 1 && (
            <button
              onClick={onPlayHistory}
              className="flex items-center gap-1 text-xs font-mono-data text-secondary hover:text-foreground transition-colors"
            >
              <History className="w-3 h-3" /> Replay Route
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lat" value={device.lat.toFixed(4)} />
          <InfoRow icon={<MapPin className="w-3 h-3" />} label="Lng" value={device.lng.toFixed(4)} />
          <InfoRow icon={<Zap className="w-3 h-3" />} label="Speed" value={`${device.speed} km/h`} />
          <InfoRow icon={<Battery className="w-3 h-3" />} label="Battery" value={`${device.battery}%`} />
          <InfoRow icon={<Clock className="w-3 h-3" />} label="Seen" value={formatTime(device.lastSeen)} />
          {device.imei && (
            <InfoRow icon={<Hash className="w-3 h-3" />} label="IMEI" value={device.imei} />
          )}
          {device.phoneNumber && (
            <InfoRow icon={<Phone className="w-3 h-3" />} label="Phone" value={device.phoneNumber} />
          )}
        </div>

        {/* Lock controls */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
          <h4 className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Remote Lock
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground flex items-center gap-1.5">
              {device.isLocked ? <Lock className="w-3.5 h-3.5 text-destructive" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
              {device.isLocked ? "Locked" : "Unlocked"}
            </span>
            <Switch
              checked={device.isLocked}
              onCheckedChange={(checked) => onToggleLock(device, checked)}
              disabled={locking}
            />
          </div>
          {device.isLocked && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Alarm Sound
                </span>
                <Switch
                  checked={device.playAlarm}
                  onCheckedChange={(checked) => onToggleAlarm(device, checked)}
                />
              </div>

              {/* Custom lock message */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono-data">
                  <MessageSquare className="w-3 h-3" /> Lock Message
                </label>
                <textarea
                  value={lockMsg}
                  onChange={(e) => { setLockMsg(e.target.value); setMsgDirty(true); }}
                  placeholder="e.g. Call +263 77 123 4567 to unlock"
                  className="w-full text-xs bg-background border border-border rounded-md p-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                />
                {msgDirty && (
                  <button
                    onClick={() => { onUpdateLockMessage(device, lockMsg); setMsgDirty(false); }}
                    className="flex items-center gap-1 text-xs font-mono-data bg-primary text-primary-foreground px-2.5 py-1 rounded hover:opacity-90 transition-opacity"
                  >
                    <Save className="w-3 h-3" /> Save Message
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDeviceDetail;
