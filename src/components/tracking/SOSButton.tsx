import { useState, useRef, useCallback } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface SOSButtonProps {
  onSOS: (message: string) => Promise<void>;
}

const SOSButton = ({ onSOS }: SOSButtonProps) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const HOLD_DURATION = 2000; // 2 seconds

  const startHold = useCallback(() => {
    if (sent || sending) return;
    setHolding(true);
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        triggerSOS();
      }
    }, 30);
  }, [sent, sending]);

  const cancelHold = useCallback(() => {
    setHolding(false);
    setProgress(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerSOS = async () => {
    setHolding(false);
    setSending(true);
    try {
      await onSOS("Emergency SOS! I need help!");
      setSent(true);
      setTimeout(() => setSent(false), 30000); // cooldown
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
        <p className="text-xs text-destructive font-medium">
          🚨 SOS Alert Sent! Admin has been notified.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        disabled={sending}
        className="relative w-full py-3 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98]"
      >
        {/* Progress overlay */}
        <div
          className="absolute inset-0 bg-destructive-foreground/20 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative z-10 flex items-center gap-2">
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {holding ? "Keep Holding..." : sending ? "Sending..." : "Hold for SOS Emergency"}
        </span>
      </button>
      <p className="text-[10px] text-muted-foreground text-center mt-1">
        Hold button for 2 seconds to send emergency alert
      </p>
    </div>
  );
};

export default SOSButton;
