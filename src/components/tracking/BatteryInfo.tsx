import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Smartphone } from "lucide-react";

interface BatteryInfoProps {
  battery: number | null;
  isCharging: boolean;
  deviceModel: string;
}

const getBatteryIcon = (level: number, charging: boolean) => {
  if (charging) return <BatteryCharging className="w-4 h-4 text-primary" />;
  if (level > 80) return <BatteryFull className="w-4 h-4 text-primary" />;
  if (level > 40) return <BatteryMedium className="w-4 h-4 text-accent-foreground" />;
  if (level > 15) return <BatteryLow className="w-4 h-4 text-destructive" />;
  return <Battery className="w-4 h-4 text-destructive animate-pulse" />;
};

const BatteryInfo = ({ battery, isCharging, deviceModel }: BatteryInfoProps) => {
  const level = battery ?? 0;
  const hasData = battery !== null;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="bg-muted/50 rounded-lg p-2.5 border border-border flex flex-col items-center">
        {hasData ? getBatteryIcon(level, isCharging) : <Battery className="w-4 h-4 text-muted-foreground" />}
        <span className="text-foreground font-medium mt-1">
          {hasData ? `${Math.round(level)}%` : "N/A"}
        </span>
        <p className="text-muted-foreground mt-0.5">
          {isCharging ? "Charging" : "Battery"}
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-2.5 border border-border flex flex-col items-center">
        <Smartphone className="w-4 h-4 text-primary" />
        <span className="text-foreground font-medium mt-1 truncate max-w-full">
          {deviceModel || "Unknown"}
        </span>
        <p className="text-muted-foreground mt-0.5">Device</p>
      </div>
    </div>
  );
};

export default BatteryInfo;
