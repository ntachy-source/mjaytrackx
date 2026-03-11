import { Crosshair, Mountain, Navigation, MapPin } from "lucide-react";

interface LocationAccuracyProps {
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  lat: number;
  lng: number;
  speed: number;
}

const getAccuracyLabel = (acc: number) => {
  if (acc <= 5) return { label: "Excellent", color: "text-primary" };
  if (acc <= 15) return { label: "Good", color: "text-primary" };
  if (acc <= 50) return { label: "Fair", color: "text-accent-foreground" };
  return { label: "Poor", color: "text-destructive" };
};

const formatCoord = (val: number, isLat: boolean) => {
  const dir = isLat ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(5)}° ${dir}`;
};

const LocationAccuracy = ({ accuracy, altitude, heading, lat, lng, speed }: LocationAccuracyProps) => {
  const accInfo = accuracy !== null ? getAccuracyLabel(accuracy) : null;

  return (
    <div className="space-y-2">
      {/* Coordinates */}
      <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Coordinates</span>
        </div>
        <p className="text-xs font-mono text-foreground">
          {formatCoord(lat, true)}, {formatCoord(lng, false)}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5 text-xs">
        <div className="bg-muted/50 rounded-lg p-2 border border-border text-center">
          <Crosshair className={`w-3.5 h-3.5 mx-auto mb-0.5 ${accInfo?.color || "text-muted-foreground"}`} />
          <span className="text-foreground font-medium text-[11px]">
            {accuracy !== null ? `±${Math.round(accuracy)}m` : "—"}
          </span>
          <p className="text-muted-foreground text-[9px] mt-0.5">
            {accInfo?.label || "GPS"}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 border border-border text-center">
          <Mountain className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
          <span className="text-foreground font-medium text-[11px]">
            {altitude !== null ? `${Math.round(altitude)}m` : "—"}
          </span>
          <p className="text-muted-foreground text-[9px] mt-0.5">Altitude</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 border border-border text-center">
          <Navigation
            className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary transition-transform"
            style={{ transform: heading !== null ? `rotate(${heading}deg)` : undefined }}
          />
          <span className="text-foreground font-medium text-[11px]">
            {heading !== null ? `${Math.round(heading)}°` : "—"}
          </span>
          <p className="text-muted-foreground text-[9px] mt-0.5">Heading</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 border border-border text-center">
          <Navigation className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />
          <span className="text-foreground font-medium text-[11px]">
            {speed > 0 ? `${Math.round(speed)}` : "0"}
          </span>
          <p className="text-muted-foreground text-[9px] mt-0.5">km/h</p>
        </div>
      </div>
    </div>
  );
};

export default LocationAccuracy;
