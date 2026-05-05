import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Loader2, CheckCircle, XCircle, Wifi, WifiOff, Signal, Download, Shield, Lock, Volume2 } from "lucide-react";
import BatteryInfo from "@/components/tracking/BatteryInfo";
import SOSButton from "@/components/tracking/SOSButton";
import LocationAccuracy from "@/components/tracking/LocationAccuracy";
import ThemeToggle from "@/components/tracking/ThemeToggle";
import { useNativeLock } from "@/hooks/useNativeLock";
import { requestNativeLocationPermission } from "@/hooks/useNativeGeolocation";

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
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [playAlarm, setPlayAlarm] = useState(false);

  // New state for client features
  const [battery, setBattery] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [deviceModel] = useState(() => getDeviceModel());
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentLat, setCurrentLat] = useState(0);
  const [currentLng, setCurrentLng] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; speed: number }>({ lat: 0, lng: 0, speed: 0 });
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmRef = useRef<AudioContext | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const offlineQueueRef = useRef<Array<{ lat: number; lng: number; speed: number; battery: number | null; ts: number }>>([]);

  // Haversine distance in meters
  const distMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-location`;

  // Battery API
  useEffect(() => {
    const getBattery = async () => {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          const batt = await nav.getBattery();
          setBattery(Math.round(batt.level * 100));
          setIsCharging(batt.charging);
          batt.addEventListener("levelchange", () => setBattery(Math.round(batt.level * 100)));
          batt.addEventListener("chargingchange", () => setIsCharging(batt.charging));
        }
      } catch {}
    };
    getBattery();
  }, []);

  // Alarm sound
  const startAlarm = useCallback(() => {
    if (alarmRef.current) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      for (let i = 0; i < 100; i++) {
        osc.frequency.setValueAtTime(880, now + i * 0.5);
        osc.frequency.linearRampToValueAtTime(1200, now + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(880, now + i * 0.5 + 0.5);
      }
      osc.start();
      alarmRef.current = ctx;
      alarmOscRef.current = osc;
    } catch {}
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmOscRef.current) { try { alarmOscRef.current.stop(); } catch {} alarmOscRef.current = null; }
    if (alarmRef.current) { try { alarmRef.current.close(); } catch {} alarmRef.current = null; }
  }, []);

  useEffect(() => {
    if (isLocked && playAlarm) startAlarm();
    else stopAlarm();
    return () => stopAlarm();
  }, [isLocked, playAlarm, startAlarm, stopAlarm]);

  // Install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
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

  const sendLocation = useCallback(async (lat: number, lng: number, speed?: number, extraBattery?: number) => {
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lat, lng, speed: speed ?? 0, battery: extraBattery ?? battery }),
      });
      if (res.ok) {
        const data = await res.json();
        setSendCount((c) => c + 1);
        setStatus("tracking");
        lastPositionRef.current = { lat, lng, speed: speed ?? 0 };
        lastSentRef.current = { lat, lng, t: Date.now() };

        // Flush any queued offline points
        if (offlineQueueRef.current.length > 0) {
          const queue = [...offlineQueueRef.current];
          offlineQueueRef.current = [];
          for (const q of queue) {
            try {
              await fetch(FUNCTION_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, lat: q.lat, lng: q.lng, speed: q.speed, battery: q.battery, ts: q.ts }),
              });
            } catch { offlineQueueRef.current.push(q); }
          }
        }

        if (data.is_locked) {
          setIsLocked(true);
          setLockMessage(data.lock_message || "This device has been locked.");
          setPlayAlarm(!!data.play_alarm);
        } else {
          setIsLocked(false);
          setPlayAlarm(false);
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to send location");
        setStatus("error");
      }
    } catch {
      // Buffer offline so we don't lose data
      offlineQueueRef.current.push({ lat, lng, speed: speed ?? 0, battery: extraBattery ?? battery, ts: Date.now() });
      if (offlineQueueRef.current.length > 200) offlineQueueRef.current.shift();
      console.warn("Network error sending location, queued for retry.");
    }
  }, [token, FUNCTION_URL, battery]);

  const sendSOS = useCallback(async (message: string) => {
    const { lat, lng, speed } = lastPositionRef.current;
    try {
      await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lat, lng, speed, battery, sos: true, sos_message: message }),
      });
    } catch {}
  }, [token, FUNCTION_URL, battery]);

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
    const handler = () => { if (document.visibilityState === "visible" && status === "tracking") requestWakeLock(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [status, requestWakeLock]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden" && status === "tracking") {
        retryIntervalRef.current = setInterval(() => {
          const { lat, lng, speed } = lastPositionRef.current;
          if (lat !== 0 || lng !== 0) sendLocation(lat, lng, speed);
        }, 10000);
      } else {
        if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null; }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => { document.removeEventListener("visibilitychange", handler); if (retryIntervalRef.current) clearInterval(retryIntervalRef.current); };
  }, [status, sendLocation]);

  useEffect(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateNet = () => { if (conn) setNetworkType(conn.effectiveType || conn.type || "unknown"); else setNetworkType(navigator.onLine ? "online" : "offline"); };
    const handleOnline = () => { setIsOnline(true); updateNet(); if (status === "tracking") { const { lat, lng, speed } = lastPositionRef.current; if (lat !== 0 || lng !== 0) sendLocation(lat, lng, speed); } };
    const handleOffline = () => { setIsOnline(false); setNetworkType("offline"); };
    updateNet();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (conn) conn.addEventListener("change", updateNet);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); if (conn) conn.removeEventListener("change", updateNet); };
  }, [status, sendLocation]);

  useEffect(() => {
    if (!token) { setErrorMsg("Invalid tracking link"); setStatus("error"); return; }
    if (!navigator.geolocation) { setErrorMsg("Geolocation is not supported by your browser"); setStatus("error"); return; }
    requestNativeLocationPermission();
    requestWakeLock();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc, altitude: alt, heading: hdg, speed: rawSpd } = pos.coords;
        const spd = rawSpd ? rawSpd * 3.6 : 0;

        // Reject obviously bad fixes (low accuracy)
        if (acc && acc > 100 && lastSentRef.current) return;

        setAccuracy(acc);
        setAltitude(alt);
        setHeading(hdg);
        setCurrentSpeed(spd);
        setCurrentLat(latitude);
        setCurrentLng(longitude);

        // Adaptive throttling: send if moved enough OR enough time elapsed
        const last = lastSentRef.current;
        const now = Date.now();
        const moved = last ? distMeters(last, { lat: latitude, lng: longitude }) : Infinity;
        const elapsed = last ? now - last.t : Infinity;

        // Send when: first fix, moved >10m, OR stationary heartbeat every 30s,
        // OR fast movement (>30km/h) — send every 5s for smoother trail
        const shouldSend =
          !last ||
          moved > 10 ||
          elapsed > 30000 ||
          (spd > 30 && elapsed > 5000);

        if (shouldSend) {
          sendLocation(latitude, longitude, spd);
        }
      },
      (err) => { setErrorMsg(err.message); setStatus("error"); },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [token, requestWakeLock, sendLocation]);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Native lock: block back button & app switching
  useNativeLock(isLocked);

  // Lock screen overlay
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-destructive flex flex-col items-center justify-center p-6 select-none"
        style={{ touchAction: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-destructive-foreground/20 animate-ping" />
            <div className="absolute inset-4 rounded-full bg-destructive-foreground/30 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-destructive-foreground flex items-center justify-center">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-destructive-foreground tracking-tight">DEVICE LOCKED</h1>
          <p className="text-lg text-destructive-foreground/90">{lockMessage}</p>
          {playAlarm && (
            <div className="flex items-center justify-center gap-2 text-destructive-foreground/80">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-mono uppercase tracking-widest">Alarm Active</span>
            </div>
          )}
          <div className="pt-8">
            <Shield className="w-6 h-6 text-destructive-foreground/50 mx-auto" />
            <p className="text-xs text-destructive-foreground/50 mt-2">Protected by TrackX</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        {/* Header with theme toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-primary tracking-wider">TRACK X</span>
          </div>
          <ThemeToggle />
        </div>

        {status === "requesting" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-foreground">Requesting Location Access</h1>
            <p className="text-sm text-muted-foreground">Please allow location access so your position can be shared.</p>
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
            <p className="text-sm text-muted-foreground">Your GPS position is being shared live.</p>

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

            {/* Battery & Device Info */}
            <BatteryInfo battery={battery} isCharging={isCharging} deviceModel={deviceModel} />

            {/* Location Accuracy & Coordinates */}
            <LocationAccuracy
              accuracy={accuracy}
              altitude={altitude}
              heading={heading}
              lat={currentLat}
              lng={currentLng}
              speed={currentSpeed}
            />

            {/* SOS Button */}
            <SOSButton onSOS={sendSOS} />

            {!isOnline && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-xs text-destructive">⚠️ You're offline. Location will resume when connectivity returns.</p>
              </div>
            )}

            {showInstall && (
              <button onClick={handleInstall} className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Download className="w-4 h-4" />
                Install App for Better Tracking
              </button>
            )}

            {isIOS && !window.matchMedia("(display-mode: standalone)").matches && !showInstall && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">📱 For best performance, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">💡 <strong>Tip:</strong> Don't close this tab. If WiFi drops, mobile data will be used automatically.</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Error</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

function getDeviceModel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Samsung/i.test(ua)) return "Samsung";
  if (/Pixel/i.test(ua)) return "Pixel";
  if (/Huawei/i.test(ua)) return "Huawei";
  if (/Xiaomi|Redmi|POCO/i.test(ua)) return "Xiaomi";
  if (/OnePlus/i.test(ua)) return "OnePlus";
  if (/OPPO/i.test(ua)) return "OPPO";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export default TrackPage;
