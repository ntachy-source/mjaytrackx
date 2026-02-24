import { useState, useCallback } from "react";
import TrackerMap from "@/components/TrackerMap";
import DevicePanel from "@/components/DevicePanel";
import StatusBar from "@/components/StatusBar";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import { useDevices, TrackedDevice } from "@/hooks/useDevices";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { devices, loading, addDevice, deleteDevice, sendLocation } = useDevices();
  const [selectedDevice, setSelectedDevice] = useState<TrackedDevice | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [followingDevice, setFollowingDevice] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectDevice = useCallback((device: TrackedDevice) => {
    setSelectedDevice((prev) => (prev?.id === device.id ? null : device));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono-data text-glow">INITIALIZING...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const syncedSelected = selectedDevice
    ? devices.find((d) => d.id === selectedDevice.id) ?? null
    : null;

  const panelContent = (
    <DevicePanel
      devices={devices}
      selectedDevice={syncedSelected}
      onSelectDevice={handleSelectDevice}
      onAddDevice={addDevice}
      onDeleteDevice={deleteDevice}
      onSendLocation={sendLocation}
      loading={loading}
    />
  );

  return (
    <div className="relative h-screen w-screen bg-background overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <TrackerMap
          devices={devices}
          selectedDevice={syncedSelected}
          onSelectDevice={handleSelectDevice}
        />
      </div>

      {/* Status bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <StatusBar devices={devices} />
      </div>

      {/* Desktop: floating side panel */}
      {!isMobile && (
        <>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="absolute top-16 left-3 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 text-primary hover:bg-card transition-colors"
          >
            {panelOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <div
            className={`absolute top-24 left-3 bottom-3 z-20 w-80 bg-card/90 backdrop-blur-md border border-border rounded-lg overflow-hidden transition-transform duration-300 ${
              panelOpen ? "translate-x-0" : "-translate-x-[calc(100%+12px)]"
            }`}
          >
            {panelContent}
          </div>
        </>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <MobileBottomSheet>
          {panelContent}
        </MobileBottomSheet>
      )}
    </div>
  );
};

export default Index;
