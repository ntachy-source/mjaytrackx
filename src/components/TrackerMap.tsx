import { useEffect, useRef } from "react";
import L from "leaflet";
import { Device } from "@/data/mockDevices";

interface TrackerMapProps {
  devices: Device[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
}

const createPulseIcon = (status: Device["status"]) => {
  const color = status === "online" ? "#00e676" : status === "idle" ? "#ffc107" : "#ff5252";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:pulse-dot 2s infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:2px solid hsl(220,20%,7%);"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const TrackerMap = ({ devices, selectedDevice, onSelectDevice }: TrackerMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map("tracker-map", {
      center: [40.73, -73.95],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    devices.forEach((device) => {
      const marker = L.marker([device.lat, device.lng], {
        icon: createPulseIcon(device.status),
      })
        .addTo(mapRef.current!)
        .bindTooltip(device.name, {
          className: "!bg-card !text-card-foreground !border-border !font-mono-data !text-xs",
          direction: "top",
          offset: [0, -12],
        })
        .on("click", () => onSelectDevice(device));
      markersRef.current.push(marker);
    });
  }, [devices, onSelectDevice]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (selectedDevice) {
      mapRef.current.flyTo([selectedDevice.lat, selectedDevice.lng], 14, { duration: 1 });
      if (selectedDevice.history.length > 1) {
        polylineRef.current = L.polyline(
          selectedDevice.history.map((h) => [h.lat, h.lng] as L.LatLngTuple),
          { color: "#00e676", weight: 2, opacity: 0.6, dashArray: "6 4" }
        ).addTo(mapRef.current);
      }
    }
  }, [selectedDevice]);

  return <div id="tracker-map" className="w-full h-full rounded-lg overflow-hidden border border-border border-glow" />;
};

export default TrackerMap;
