import { useState, useEffect } from "react";
import { Pencil, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrackedDevice } from "@/hooks/useDevices";

interface EditDeviceDialogProps {
  device: TrackedDevice | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (id: string, updates: { name: string; imei?: string | null; phoneNumber?: string | null }) => Promise<void>;
}

const EditDeviceDialog = ({ device, open, onOpenChange, onSave }: EditDeviceDialogProps) => {
  const [name, setName] = useState("");
  const [imei, setImei] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (device) {
      setName(device.name);
      setImei(device.imei ?? "");
      setPhoneNumber(device.phoneNumber ?? "");
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device || !name.trim()) return;
    setLoading(true);
    await onSave(device.id, {
      name: name.trim(),
      imei: imei.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
    });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-mono-data">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Device
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Device name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <input
            type="text"
            placeholder="IMEI (15 digits)"
            value={imei}
            onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-mono-data text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDeviceDialog;
