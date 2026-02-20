import { Radar, Wifi, Shield } from "lucide-react";
import { Device } from "@/data/mockDevices";

interface StatusBarProps {
  devices: Device[];
}

const StatusBar = ({ devices }: StatusBarProps) => {
  const online = devices.filter((d) => d.status === "online").length;

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-6">
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-primary text-glow" />
        <span className="font-bold text-foreground tracking-tight text-lg">
          TRACK<span className="text-primary">X</span>
        </span>
      </div>
      <div className="h-6 w-px bg-border" />
      <div className="flex items-center gap-4 text-xs font-mono-data text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground">{online}</span> ACTIVE
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-secondary" />
          ENCRYPTED
        </span>
      </div>
      <div className="ml-auto text-xs font-mono-data text-muted-foreground">
        {new Date().toLocaleTimeString()} UTC
      </div>
    </header>
  );
};

export default StatusBar;
