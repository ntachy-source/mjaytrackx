import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { motion } from "framer-motion";
import { BarChart3, X } from "lucide-react";
import type { AdminDevice } from "@/hooks/useAdminDevices";

interface DeviceAnalyticsProps {
  devices: AdminDevice[];
  isOpen: boolean;
  onClose: () => void;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DeviceAnalytics = ({ devices, isOpen, onClose }: DeviceAnalyticsProps) => {
  const batteryData = useMemo(() => {
    return devices
      .filter((d) => d.lat !== 0 || d.lng !== 0)
      .map((d) => ({
        name: d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name,
        battery: d.battery,
        fill: d.battery < 20 ? "hsl(0 70% 50%)" : d.battery < 50 ? "hsl(45 100% 50%)" : "hsl(155 100% 45%)",
      }));
  }, [devices]);

  const statusData = useMemo(() => {
    const online = devices.filter((d) => d.status === "online").length;
    const idle = devices.filter((d) => d.status === "idle").length;
    const offline = devices.filter((d) => d.status === "offline").length;
    return [
      { name: "Online", count: online, fill: "hsl(155 100% 45%)" },
      { name: "Idle", count: idle, fill: "hsl(45 100% 50%)" },
      { name: "Offline", count: offline, fill: "hsl(0 70% 50%)" },
    ];
  }, [devices]);

  const distanceData = useMemo(() => {
    return devices
      .filter((d) => d.history.length > 1)
      .map((d) => {
        let dist = 0;
        for (let i = 1; i < d.history.length; i++) {
          dist += haversineDistance(
            d.history[i - 1].lat, d.history[i - 1].lng,
            d.history[i].lat, d.history[i].lng
          );
        }
        return {
          name: d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name,
          distance: parseFloat(dist.toFixed(2)),
        };
      })
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 10);
  }, [devices]);

  // Battery over time for all devices (use history timestamps)
  const batteryTimeline = useMemo(() => {
    const allPoints: { time: number; battery: number }[] = [];
    devices.forEach((d) => {
      if (d.history.length > 0) {
        allPoints.push({ time: d.lastSeen.getTime(), battery: d.battery });
      }
    });
    return allPoints
      .sort((a, b) => a.time - b.time)
      .slice(-20)
      .map((p) => ({
        time: new Date(p.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        battery: p.battery,
      }));
  }, [devices]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="absolute top-[6.5rem] right-3 bottom-3 z-20 w-80 bg-card/95 backdrop-blur-md border border-border rounded-lg overflow-hidden flex flex-col"
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-mono-data uppercase tracking-widest text-primary text-glow flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Analytics
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Status Distribution */}
        <div>
          <h3 className="text-[10px] font-mono-data uppercase tracking-widest text-muted-foreground mb-2">
            Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(160 20% 55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(160 20% 55%)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(155 30% 18%)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "hsl(160 60% 85%)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, i) => (
                  <Bar key={i} dataKey="count" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Battery Levels */}
        <div>
          <h3 className="text-[10px] font-mono-data uppercase tracking-widest text-muted-foreground mb-2">
            Battery Levels
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={batteryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(160 20% 55%)" }} angle={-30} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(160 20% 55%)" }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(155 30% 18%)", borderRadius: 8, fontSize: 11 }}
              />
              <Bar dataKey="battery" radius={[4, 4, 0, 0]}>
                {batteryData.map((entry, i) => (
                  <Bar key={i} dataKey="battery" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distance Traveled */}
        {distanceData.length > 0 && (
          <div>
            <h3 className="text-[10px] font-mono-data uppercase tracking-widest text-muted-foreground mb-2">
              Distance Traveled (km)
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={distanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(160 20% 55%)" }} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(160 20% 55%)" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(155 30% 18%)", borderRadius: 8, fontSize: 11 }}
                  formatter={(value: number) => [`${value} km`, "Distance"]}
                />
                <Bar dataKey="distance" fill="hsl(200 80% 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Battery Timeline */}
        {batteryTimeline.length > 1 && (
          <div>
            <h3 className="text-[10px] font-mono-data uppercase tracking-widest text-muted-foreground mb-2">
              Latest Battery Readings
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={batteryTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(160 20% 55%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(160 20% 55%)" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(155 30% 18%)", borderRadius: 8, fontSize: 11 }}
                />
                <Area type="monotone" dataKey="battery" stroke="hsl(45 100% 50%)" fill="hsl(45 100% 50% / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DeviceAnalytics;
