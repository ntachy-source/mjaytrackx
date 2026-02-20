import { useState } from "react";
import { Plus, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddDeviceDialogProps {
  onAdd: (name: string) => Promise<void>;
}

const AddDeviceDialog = ({ onAdd }: AddDeviceDialogProps) => {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name.trim());
    setName("");
    setOpen(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full p-3 border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-mono-data">
          <Plus className="w-4 h-4" />
          ADD DEVICE
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-mono-data">
            <Smartphone className="w-5 h-5 text-primary" />
            Register New Device
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Device name (e.g. iPhone 15)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground font-mono-data text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-mono-data text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "REGISTERING..." : "REGISTER DEVICE"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;
