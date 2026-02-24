import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { TrackedDevice } from "@/hooks/useDevices";
import { Locate } from "lucide-react";

interface TrackerMapProps {
  devices: TrackedDevice[];
  selectedDevice: TrackedDevice | null;
  onSelectDevice: (device: TrackedDevice) => void;
  followDevice?: boolean;
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

const myLocationIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#4285F4;opacity:0.2;animation:pulse-dot 2s infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#4285F4;border:2px solid white;"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const TrackerMap = ({ devices, selectedDevice, onSelectDevice, followDevice }: TrackerMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const myLocMarkerRef = useRef<L.Marker | null>(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map("tracker-map", {
      center: [0, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
  }, []);

  // Place device markers and auto-fit on first load
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

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
          permanent: validDevices.length === 1,
        })
        .on("click", () => onSelectDevice(device));
      markersRef.current.push(marker);
    });

    // Auto-fit to devices on first data load
    if (validDevices.length > 0 && !hasFittedRef.current && !selectedDevice) {
      hasFittedRef.current = true;
      if (validDevices.length === 1) {
        mapRef.current.setView([validDevices[0].lat, validDevices[0].lng], 16);
      } else {
        const bounds = L.latLngBounds(validDevices.map((d) => [d.lat, d.lng] as L.LatLngTuple));
        mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
  }, [devices, onSelectDevice, selectedDevice]);

  // Fly to selected device & follow on updates
  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (selectedDevice && (selectedDevice.lat !== 0 || selectedDevice.lng !== 0)) {
      if (followDevice) {
        mapRef.current.flyTo([selectedDevice.lat, selectedDevice.lng], 17, { duration: 1 });
      }
      if (selectedDevice.history.length > 1) {
        polylineRef.current = L.polyline(
          selectedDevice.history.map((h) => [h.lat, h.lng] as L.LatLngTuple),
          { color: "#00e676", weight: 3, opacity: 0.7, dashArray: "6 4" }
        ).addTo(mapRef.current);
      }
    }
  }, [selectedDevice, followDevice]);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (myLocMarkerRef.current) myLocMarkerRef.current.remove();
        myLocMarkerRef.current = L.marker([latitude, longitude], { icon: myLocationIcon })
          .addTo(mapRef.current!)
          .bindTooltip("You are here", {
            className: "!bg-card !text-card-foreground !border-border !font-mono-data !text-xs",
            direction: "top",
            offset: [0, -12],
          });
        mapRef.current!.flyTo([latitude, longitude], 16, { duration: 1 });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-full">
      <div id="tracker-map" className="w-full h-full" />
      {/* Locate me button */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-20 right-3 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2.5 text-primary hover:bg-card transition-colors shadow-lg"
        title="My location"
      >
        <Locate className="w-5 h-5" />
      </button>
    </div>
  );
};

export default TrackerMap;
