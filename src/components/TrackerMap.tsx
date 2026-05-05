import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { TrackedDevice } from "@/hooks/useDevices";
import { Geofence } from "@/hooks/useGeofences";
import { Locate, Layers } from "lucide-react";

interface TrackerMapProps {
  devices: TrackedDevice[];
  selectedDevice: TrackedDevice | null;
  onSelectDevice: (device: TrackedDevice) => void;
  followDevice?: boolean;
  geofences?: Geofence[];
}

type MapStyle = "satellite" | "hybrid" | "streets" | "terrain" | "dark";

const TILE_LAYERS: Record<MapStyle, { url: string; attribution: string; maxZoom: number; subdomains?: string }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    maxZoom: 19,
  },
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    maxZoom: 19,
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "OSM",
    maxZoom: 19,
    subdomains: "abc",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "OpenTopoMap",
    maxZoom: 17,
    subdomains: "abc",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "CARTO",
    maxZoom: 19,
    subdomains: "abcd",
  },
};

const createRadarIcon = (status: TrackedDevice["status"], heading?: number | null) => {
  const color = status === "online" ? "#00e676" : status === "idle" ? "#ffc107" : "#ff5252";
  const arrow = heading != null && !isNaN(heading)
    ? `<div style="position:absolute;top:-14px;left:50%;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid ${color};transform:translateX(-50%) rotate(${heading}deg);transform-origin:50% 26px;filter:drop-shadow(0 0 4px ${color});"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;animation:ring-expand 2s infinite;"></div>
        <div style="position:absolute;inset:6px;border-radius:50%;background:${color};opacity:0.4;animation:ring-expand 2s infinite 0.6s;"></div>
        <div style="position:absolute;inset:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 12px ${color},0 2px 6px rgba(0,0,0,0.5);"></div>
        ${arrow}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const myLocationIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#4285F4;opacity:0.25;animation:ring-expand 2s infinite;"></div>
      <div style="position:absolute;inset:5px;border-radius:50%;background:#4285F4;border:2px solid white;box-shadow:0 0 8px #4285F4;"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const TrackerMap = ({ devices, selectedDevice, onSelectDevice, followDevice, geofences }: TrackerMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const animFramesRef = useRef<Map<string, number>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const myLocMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCirclesRef = useRef<L.Circle[]>([]);
  const hasFittedRef = useRef(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [showStyles, setShowStyles] = useState(false);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    mapRef.current = L.map("tracker-map", {
      center: [0, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
  }, []);

  // Apply tile layer when style changes
  useEffect(() => {
    if (!mapRef.current) return;
    const cfg = TILE_LAYERS[mapStyle];
    if (baseLayerRef.current) baseLayerRef.current.remove();
    if (labelsLayerRef.current) { labelsLayerRef.current.remove(); labelsLayerRef.current = null; }

    baseLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains as any,
    }).addTo(mapRef.current);

    // Hybrid: add roads + labels overlay
    if (mapStyle === "hybrid") {
      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.9 }
      ).addTo(mapRef.current);
    }
  }, [mapStyle]);

  // Smoothly animate marker between positions
  const animateMarker = (id: string, marker: L.Marker, to: L.LatLngExpression, duration = 1200) => {
    const existing = animFramesRef.current.get(id);
    if (existing) cancelAnimationFrame(existing);
    const from = marker.getLatLng();
    const target = L.latLng(to as any);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const lat = from.lat + (target.lat - from.lat) * e;
      const lng = from.lng + (target.lng - from.lng) * e;
      marker.setLatLng([lat, lng]);
      if (t < 1) animFramesRef.current.set(id, requestAnimationFrame(step));
      else animFramesRef.current.delete(id);
    };
    animFramesRef.current.set(id, requestAnimationFrame(step));
  };

  // Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const validDevices = devices.filter((d) => d.lat !== 0 || d.lng !== 0);
    const seenIds = new Set<string>();

    validDevices.forEach((device) => {
      seenIds.add(device.id);
      const heading = (device as any).heading ?? null;
      const existing = markersRef.current.get(device.id);
      if (existing) {
        existing.setIcon(createRadarIcon(device.status, heading));
        animateMarker(device.id, existing, [device.lat, device.lng]);
      } else {
        const marker = L.marker([device.lat, device.lng], {
          icon: createRadarIcon(device.status, heading),
        })
          .addTo(mapRef.current!)
          .bindTooltip(device.name, {
            className: "!bg-card !text-card-foreground !border-border !font-mono-data !text-xs",
            direction: "top",
            offset: [0, -20],
            permanent: validDevices.length === 1,
          })
          .on("click", () => onSelectDevice(device));
        markersRef.current.set(device.id, marker);
      }
    });

    // Remove stale markers
    markersRef.current.forEach((m, id) => {
      if (!seenIds.has(id)) { m.remove(); markersRef.current.delete(id); }
    });

    if (validDevices.length > 0 && !hasFittedRef.current && !selectedDevice) {
      hasFittedRef.current = true;
      if (validDevices.length === 1) {
        mapRef.current.setView([validDevices[0].lat, validDevices[0].lng], 17);
      } else {
        const bounds = L.latLngBounds(validDevices.map((d) => [d.lat, d.lng] as L.LatLngTuple));
        mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    }
  }, [devices, onSelectDevice, selectedDevice]);

  // Selected device follow + trail + accuracy ring
  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null; }

    if (selectedDevice && (selectedDevice.lat !== 0 || selectedDevice.lng !== 0)) {
      if (followDevice) {
        mapRef.current.flyTo([selectedDevice.lat, selectedDevice.lng], 18, { duration: 1.2 });
      }
      if (selectedDevice.history.length > 1) {
        const latlngs = selectedDevice.history.map((h) => [h.lat, h.lng] as L.LatLngTuple);
        polylineRef.current = L.polyline(latlngs, {
          color: "#00e676",
          weight: 4,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);
        // glow underlay
        L.polyline(latlngs, { color: "#00e676", weight: 10, opacity: 0.15 }).addTo(mapRef.current);
      }
      const acc = (selectedDevice as any).accuracy;
      if (acc && acc > 0) {
        accuracyCircleRef.current = L.circle([selectedDevice.lat, selectedDevice.lng], {
          radius: acc,
          color: "#00e676",
          weight: 1,
          opacity: 0.5,
          fillColor: "#00e676",
          fillOpacity: 0.08,
        }).addTo(mapRef.current);
      }
    }
  }, [selectedDevice, followDevice]);

  // Geofences
  useEffect(() => {
    if (!mapRef.current) return;
    geofenceCirclesRef.current.forEach((c) => c.remove());
    geofenceCirclesRef.current = [];
    (geofences || []).forEach((fence) => {
      if (!fence.is_active) return;
      const circle = L.circle([fence.lat, fence.lng], {
        radius: fence.radius_meters,
        color: "#00e676",
        fillColor: "#00e676",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "6 4",
      })
        .addTo(mapRef.current!)
        .bindTooltip(fence.name, {
          className: "!bg-card !text-card-foreground !border-border !font-mono-data !text-xs",
          direction: "top",
        });
      geofenceCirclesRef.current.push(circle);
    });
  }, [geofences]);

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
        mapRef.current!.flyTo([latitude, longitude], 17, { duration: 1 });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const styles: { id: MapStyle; label: string }[] = [
    { id: "satellite", label: "Satellite" },
    { id: "hybrid", label: "Hybrid" },
    { id: "streets", label: "Streets" },
    { id: "terrain", label: "Terrain" },
    { id: "dark", label: "Dark" },
  ];

  return (
    <div className="relative w-full h-full">
      <div id="tracker-map" className="w-full h-full" />

      {/* Layer switcher */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setShowStyles((s) => !s)}
          className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2.5 text-primary hover:bg-card transition-colors shadow-lg"
          title="Map style"
        >
          <Layers className="w-5 h-5" />
        </button>
        {showStyles && (
          <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl overflow-hidden min-w-[140px] animate-fade-in">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => { setMapStyle(s.id); setShowStyles(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-mono-data transition-colors ${
                  mapStyle === s.id ? "bg-primary/20 text-primary" : "text-foreground hover:bg-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
