import { useState, useCallback } from "react";
import TrackerMap from "@/components/TrackerMap";
import DevicePanel from "@/components/DevicePanel";
import StatusBar from "@/components/StatusBar";
import { useDevices, TrackedDevice } from "@/hooks/useDevices";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { devices, loading, addDevice, deleteDevice, sendLocation } = useDevices();
  const [selectedDevice, setSelectedDevice] = useState<TrackedDevice | null>(null);

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

  // Keep selected device in sync
  const syncedSelected = selectedDevice
    ? devices.find((d) => d.id === selectedDevice.id) ?? null
    : null;

  return (
    <div className="flex flex-col h-screen bg-background scanline">
      <StatusBar devices={devices} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <DevicePanel
            devices={devices}
            selectedDevice={syncedSelected}
            onSelectDevice={handleSelectDevice}
            onAddDevice={addDevice}
            onDeleteDevice={deleteDevice}
            onSendLocation={sendLocation}
            loading={loading}
          />
        </aside>
        <main className="flex-1 p-3">
          <TrackerMap
            devices={devices}
            selectedDevice={syncedSelected}
            onSelectDevice={handleSelectDevice}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
