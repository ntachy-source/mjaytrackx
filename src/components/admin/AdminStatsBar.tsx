import { Wifi, WifiOff, Battery, Lock, Smartphone } from "lucide-react";
import type { AdminDevice } from "@/hooks/useAdminDevices";

interface AdminStatsBarProps {
  devices: AdminDevice[];
}

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="flex items-center gap-2 bg-card/80 border border-border rounded-lg px-3 py-2 min-w-[120px]">
    <span className={color}>{icon}</span>
    <div className="flex flex-col">
      <span className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold font-mono-data text-foreground">{value}</span>
    </div>
  </div>
);

const AdminStatsBar = ({ devices }: AdminStatsBarProps) => {
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const locked = devices.filter((d) => d.isLocked).length;
  const avgBattery =
    devices.length > 0
      ? Math.round(devices.reduce((s, d) => s + d.battery, 0) / devices.length)
      : 0;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <StatCard
        icon={<Smartphone className="w-3.5 h-3.5" />}
        label="Total"
        value={devices.length}
        color="text-primary"
      />
      <StatCard
        icon={<Wifi className="w-3.5 h-3.5" />}
        label="Online"
        value={online}
        color="text-green-400"
      />
      <StatCard
        icon={<WifiOff className="w-3.5 h-3.5" />}
        label="Offline"
        value={offline}
        color="text-red-400"
      />
      <StatCard
        icon={<Lock className="w-3.5 h-3.5" />}
        label="Locked"
        value={locked}
        color="text-destructive"
      />
      <StatCard
        icon={<Battery className="w-3.5 h-3.5" />}
        label="Avg Battery"
        value={`${avgBattery}%`}
        color="text-yellow-400"
      />
    </div>
  );
};

export default AdminStatsBar;
