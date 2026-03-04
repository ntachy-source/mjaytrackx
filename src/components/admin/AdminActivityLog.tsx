import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Lock, Unlock, Volume2, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  action: string;
  target_device_name: string | null;
  details: string | null;
  created_at: string;
}

const actionIcon = (action: string) => {
  if (action.includes("lock")) return <Lock className="w-3 h-3" />;
  if (action.includes("unlock")) return <Unlock className="w-3 h-3" />;
  if (action.includes("alarm")) return <Volume2 className="w-3 h-3" />;
  return <Activity className="w-3 h-3" />;
};

const actionColor = (action: string) => {
  if (action.includes("lock")) return "text-destructive";
  if (action.includes("unlock")) return "text-green-400";
  if (action.includes("alarm")) return "text-yellow-400";
  return "text-primary";
};

const AdminActivityLog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("admin_activity_logs")
        .select("id, action, target_device_name, details, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs((data as LogEntry[]) || []);
      setLoading(false);
    };
    fetch();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-12 right-3 bottom-3 z-20 w-80 bg-card/95 backdrop-blur-md border border-border rounded-lg overflow-hidden flex flex-col"
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-mono-data uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" /> Activity Log
        </h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-xs font-mono-data">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs font-mono-data">No activity yet</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded-lg bg-muted/30 border border-transparent hover:border-border text-xs space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className={actionColor(log.action)}>{actionIcon(log.action)}</span>
                <span className="font-medium text-foreground capitalize">{log.action}</span>
                {log.target_device_name && (
                  <span className="text-muted-foreground truncate ml-auto">
                    {log.target_device_name}
                  </span>
                )}
              </div>
              {log.details && (
                <p className="text-muted-foreground text-[10px] pl-5">{log.details}</p>
              )}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                <Clock className="w-2.5 h-2.5" />
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default AdminActivityLog;
