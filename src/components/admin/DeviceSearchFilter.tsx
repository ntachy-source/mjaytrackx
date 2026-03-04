import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type StatusFilter = "all" | "online" | "idle" | "offline" | "locked";

interface DeviceSearchFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
}

const filters: { label: string; value: StatusFilter; color: string }[] = [
  { label: "All", value: "all", color: "bg-muted text-foreground" },
  { label: "Online", value: "online", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { label: "Idle", value: "idle", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { label: "Offline", value: "offline", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { label: "Locked", value: "locked", color: "bg-destructive/20 text-destructive border-destructive/30" },
];

const DeviceSearchFilter = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: DeviceSearchFilterProps) => (
  <div className="space-y-2">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search devices..."
        className="pl-8 h-8 text-xs bg-muted/50 border-border"
      />
      {search && (
        <button
          onClick={() => onSearchChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
    <div className="flex flex-wrap gap-1">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onStatusFilterChange(f.value)}
          className={`text-[10px] font-mono-data px-2 py-0.5 rounded-full border transition-all ${
            statusFilter === f.value
              ? f.color + " border-current"
              : "bg-transparent text-muted-foreground border-transparent hover:border-border"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  </div>
);

export default DeviceSearchFilter;
