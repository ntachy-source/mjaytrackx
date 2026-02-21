import { useEffect, useRef } from "react";
import L from "leaflet";
import { TrackedDevice } from "@/hooks/useDevices";

interface TrackerMapProps {
  devices: TrackedDevice[];
  selectedDevice: TrackedDevice | null;
  onSelectDevice: (device: TrackedDevice) => void;
}

const createPulseIcon = (status: TrackedDevice["status"]) => {
  const color = status === "online" ? "#00e676" : status === "idle" ? "#ffc107" : "#ff5252";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:pulse-dot 2s infinite;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:2px solid hsl(220,20%,7%);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to bottom-right (Google Maps style)
    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Auto-fit bounds to show all devices
    const validDevices = devices.filter((d) => d.lat !== 0 || d.lng !== 0);

    validDevices.forEach((device) => {
      const marker = L.marker([device.lat, device.lng], {
        icon: createPulseIcon(device.status),
      })
        .addTo(mapRef.current!)
        .bindTooltip(device.name, {
          className: "!bg-card !text-card-foreground !border-border !font-mono-data !text-xs",
          direction: "top",
          offset: [0, -14],
        })
        .on("click", () => onSelectDevice(device));
      markersRef.current.push(marker);
    });

    // Fit bounds if we have devices and no selected device
    if (validDevices.length > 0 && !selectedDevice) {
      const bounds = L.latLngBounds(validDevices.map((d) => [d.lat, d.lng] as L.LatLngTuple));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [devices, onSelectDevice, selectedDevice]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (selectedDevice && (selectedDevice.lat !== 0 || selectedDevice.lng !== 0)) {
      mapRef.current.flyTo([selectedDevice.lat, selectedDevice.lng], 16, { duration: 1 });
      if (selectedDevice.history.length > 1) {
        polylineRef.current = L.polyline(
          selectedDevice.history.map((h) => [h.lat, h.lng] as L.LatLngTuple),
          { color: "#00e676", weight: 3, opacity: 0.7, dashArray: "6 4" }
        ).addTo(mapRef.current);
      }
    }
  }, [selectedDevice]);

  return <div id="tracker-map" className="w-full h-full" />;
};

export default TrackerMap;
