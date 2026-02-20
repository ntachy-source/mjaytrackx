import { useState, useCallback } from "react";
import TrackerMap from "@/components/TrackerMap";
import DevicePanel from "@/components/DevicePanel";
import StatusBar from "@/components/StatusBar";
import { mockDevices, Device } from "@/data/mockDevices";

const Index = () => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const handleSelectDevice = useCallback((device: Device) => {
    setSelectedDevice((prev) => (prev?.id === device.id ? null : device));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background scanline">
      <StatusBar devices={mockDevices} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <DevicePanel
            devices={mockDevices}
            selectedDevice={selectedDevice}
            onSelectDevice={handleSelectDevice}
          />
        </aside>
        <main className="flex-1 p-3">
          <TrackerMap
            devices={mockDevices}
            selectedDevice={selectedDevice}
            onSelectDevice={handleSelectDevice}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
