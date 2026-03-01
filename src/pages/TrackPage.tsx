import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Loader2, CheckCircle, XCircle, Wifi, WifiOff, Signal, Download, Shield } from "lucide-react";

const TrackPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"requesting" | "tracking" | "error">("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const [bgActive, setBgActive] = useState(false);
  const [networkType, setNetworkType] = useState<string>("unknown");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; speed: number }>({ lat: 0, lng: 0, speed: 0 });
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-location`;

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const sendLocation = useCallback(async (lat: number, lng: number, speed?: number) => {
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lat, lng, speed: speed ?? 0 }),
      });
      if (res.ok) {
        setSendCount((c) => c + 1);
        setStatus("tracking");
        lastPositionRef.current = { lat, lng, speed: speed ?? 0 };
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to send location");
        setStatus("error");
      }
    } catch {
      console.warn("Network error sending location, will retry...");
    }
  }, [token, FUNCTION_URL]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setBgActive(true);
        wakeLockRef.current.addEventListener("release", () => setBgActive(false));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && status === "tracking") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, requestWakeLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && status === "tracking") {
        retryIntervalRef.current = setInterval(() => {
          const { lat, lng, speed } = lastPositionRef.current;
          if (lat !== 0 || lng !== 0) sendLocation(lat, lng, speed);
        }, 10000);
      } else {
        if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null; }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [status, sendLocation]);

  useEffect(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateNetworkType = () => {
      if (conn) setNetworkType(conn.effectiveType || conn.type || "unknown");
      else setNetworkType(navigator.onLine ? "online" : "offline");
    };
    const handleOnline = () => {
      setIsOnline(true);
      updateNetworkType();
      if (status === "tracking") {
        const { lat, lng, speed } = lastPositionRef.current;
        if (lat !== 0 || lng !== 0) sendLocation(lat, lng, speed);
      }
    };
    const handleOffline = () => { setIsOnline(false); setNetworkType("offline"); };
    updateNetworkType();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (conn) conn.addEventListener("change", updateNetworkType);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) conn.removeEventListener("change", updateNetworkType);
    };
  }, [status, sendLocation]);

  useEffect(() => {
    if (!token) { setErrorMsg("Invalid tracking link"); setStatus("error"); return; }
    if (!navigator.geolocation) { setErrorMsg("Geolocation is not supported by your browser"); setStatus("error"); return; }
    requestWakeLock();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ? pos.coords.speed * 3.6 : 0),
      (err) => { setErrorMsg(err.message); setStatus("error"); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [token, requestWakeLock, sendLocation]);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* App header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-primary tracking-wider">TRACK X</span>
        </div>

        {status === "requesting" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-foreground">Requesting Location Access</h1>
            <p className="text-sm text-muted-foreground">
              Please allow location access so your position can be shared.
            </p>
            <p className="text-xs text-muted-foreground">Keep this page open for continuous tracking.</p>
          </>
        )}

        {status === "tracking" && (
          <>
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Location Sharing Active</h1>
            <p className="text-sm text-muted-foreground">
              Your GPS position is being shared live. Keep this page open.
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
                <CheckCircle className="w-4 h-4 text-primary mx-auto mb-1" />
                <span className="text-foreground font-medium">{sendCount}</span>
                <p className="text-muted-foreground mt-0.5">Updates</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
                {bgActive ? <Wifi className="w-4 h-4 text-primary mx-auto mb-1" /> : <WifiOff className="w-4 h-4 text-muted-foreground mx-auto mb-1" />}
                <span className="text-foreground font-medium">{bgActive ? "Active" : "May sleep"}</span>
                <p className="text-muted-foreground mt-0.5">Screen</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 border border-border">
                {isOnline ? <Signal className="w-4 h-4 text-primary mx-auto mb-1" /> : <WifiOff className="w-4 h-4 text-destructive mx-auto mb-1" />}
                <span className="text-foreground font-medium">
                  {isOnline ? (networkType === "4g" ? "4G" : networkType === "3g" ? "3G" : "Online") : "Offline"}
                </span>
                <p className="text-muted-foreground mt-0.5">Network</p>
              </div>
            </div>

            {!isOnline && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-xs text-destructive">
                  ⚠️ You're offline. Location will resume automatically when connectivity returns.
                </p>
              </div>
            )}

            {/* Install prompt */}
            {showInstall && (
              <button
                onClick={handleInstall}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Install App for Better Tracking
              </button>
            )}

            {/* iOS install hint */}
            {isIOS && !window.matchMedia("(display-mode: standalone)").matches && !showInstall && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  📱 For best performance, tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install this app.
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> Don't close this tab. If WiFi drops, your phone's mobile data will be used automatically.
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Error</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackPage;
