import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Clock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

interface HistoryPoint {
  lat: number;
  lng: number;
  timestamp: Date;
}

interface HistoryPlaybackProps {
  history: HistoryPoint[];
  deviceName: string;
  onPositionChange: (point: HistoryPoint) => void;
  onClose: () => void;
}

const HistoryPlayback = ({ history, deviceName, onPositionChange, onClose }: HistoryPlaybackProps) => {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (history.length < 2) return;
    setPlaying(true);
  }, [history]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= history.length - 1) {
          stopPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, history.length, stopPlayback]);

  useEffect(() => {
    if (history[index]) onPositionChange(history[index]);
  }, [index, history, onPositionChange]);

  if (history.length < 2) return null;

  const current = history[index];
  const formatTs = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-card/95 backdrop-blur-md border border-border rounded-xl p-4 w-[360px] max-w-[90vw] shadow-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-mono-data uppercase tracking-widest text-primary text-glow flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Route Playback — {deviceName}
        </h4>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <Slider
        value={[index]}
        onValueChange={([v]) => { setIndex(v); if (playing) stopPlayback(); }}
        min={0}
        max={history.length - 1}
        step={1}
        className="my-3"
      />

      <div className="flex items-center justify-between text-xs font-mono-data text-muted-foreground mb-3">
        <span>{formatTs(history[0].timestamp)}</span>
        <span className="text-foreground">{current ? formatTs(current.timestamp) : "—"}</span>
        <span>{formatTs(history[history.length - 1].timestamp)}</span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => { setIndex(0); stopPlayback(); }}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={() => playing ? stopPlayback() : startPlayback()}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setIndex(history.length - 1); stopPlayback(); }}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <div className="ml-3 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Speed:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-xs font-mono-data transition-colors ${
                speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono-data">
        <div className="bg-muted rounded p-1.5 text-center">
          <span className="text-muted-foreground">Point </span>
          <span className="text-foreground">{index + 1}/{history.length}</span>
        </div>
        <div className="bg-muted rounded p-1.5 text-center">
          <span className="text-muted-foreground">Pos </span>
          <span className="text-foreground">{current?.lat.toFixed(4)}, {current?.lng.toFixed(4)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default HistoryPlayback;
