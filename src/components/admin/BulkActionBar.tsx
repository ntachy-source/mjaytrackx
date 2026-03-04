import { Lock, Unlock, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  onLockAll: () => void;
  onUnlockAll: () => void;
  onAlarmAll: () => void;
  onAlarmOffAll: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

const BulkActionBar = ({
  selectedCount,
  onLockAll,
  onUnlockAll,
  onAlarmAll,
  onAlarmOffAll,
  onClearSelection,
  disabled,
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="p-2 border-t border-border bg-muted/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono-data text-primary text-glow">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <Button
          size="sm"
          variant="destructive"
          className="text-xs h-7"
          onClick={onLockAll}
          disabled={disabled}
        >
          <Lock className="w-3 h-3 mr-1" /> Lock All
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={onUnlockAll}
          disabled={disabled}
        >
          <Unlock className="w-3 h-3 mr-1" /> Unlock All
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="text-xs h-7"
          onClick={onAlarmAll}
          disabled={disabled}
        >
          <Volume2 className="w-3 h-3 mr-1" /> Alarm On
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7"
          onClick={onAlarmOffAll}
          disabled={disabled}
        >
          <VolumeX className="w-3 h-3 mr-1" /> Alarm Off
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
