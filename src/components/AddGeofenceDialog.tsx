import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrackedDevice } from "@/hooks/useDevices";
import { Shield } from "lucide-react";

interface AddGeofenceDialogProps {
  devices: TrackedDevice[];
  onAdd: (deviceId: string, name: string, lat: number, lng: number, radius: number) => Promise<void>;
}

const AddGeofenceDialog = ({ devices, onAdd }: AddGeofenceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("200");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !deviceId || !lat || !lng) return;
    setSubmitting(true);
    await onAdd(deviceId, name, parseFloat(lat), parseFloat(lng), parseInt(radius) || 200);
    setSubmitting(false);
    setOpen(false);
    setName("");
    setDeviceId("");
    setLat("");
    setLng("");
    setRadius("200");
  };

  const useDeviceLocation = () => {
    const dev = devices.find((d) => d.id === deviceId);
    if (dev && (dev.lat !== 0 || dev.lng !== 0)) {
      setLat(dev.lat.toFixed(6));
      setLng(dev.lng.toFixed(6));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          ADD GEOFENCE
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono-data">Add Geofence Zone</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Device</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Zone Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office, Home" className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.2921" className="text-sm font-mono-data" />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="36.8219" className="text-sm font-mono-data" />
            </div>
          </div>
          {deviceId && (
            <button onClick={useDeviceLocation} className="text-xs text-primary hover:underline">
              Use device's current location
            </button>
          )}
          <div>
            <Label className="text-xs">Radius (meters)</Label>
            <Input value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="200" className="text-sm font-mono-data" />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name || !deviceId || !lat || !lng}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Geofence"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddGeofenceDialog;
