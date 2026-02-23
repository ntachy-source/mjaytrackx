import { Radar, Wifi, Shield, LogOut, ShieldCheck } from "lucide-react";
import { TrackedDevice } from "@/hooks/useDevices";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "react-router-dom";

interface StatusBarProps {
  devices: TrackedDevice[];
}

const StatusBar = ({ devices }: StatusBarProps) => {
  const online = devices.filter((d) => d.status === "online").length;
  const { signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  return (
    <header className="h-12 md:h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 md:px-6 gap-3 md:gap-6">
      <div className="flex items-center gap-2">
        <Radar className="w-4 h-4 md:w-5 md:h-5 text-primary text-glow" />
        <span className="font-bold text-foreground tracking-tight text-base md:text-lg">
          TRACK<span className="text-primary">X</span>
        </span>
      </div>
      <div className="h-6 w-px bg-border hidden sm:block" />
      <div className="hidden sm:flex items-center gap-4 text-xs font-mono-data text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground">{online}</span> ACTIVE
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-secondary" />
          ENCRYPTED
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <span className="text-xs font-mono-data text-muted-foreground flex items-center gap-1.5 sm:hidden">
          <Wifi className="w-3 h-3 text-primary" />
          {online}
        </span>
        <span className="text-xs font-mono-data text-muted-foreground hidden md:block">
          {new Date().toLocaleTimeString()}
        </span>
        <button
          onClick={signOut}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default StatusBar;
