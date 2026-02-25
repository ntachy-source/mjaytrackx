import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Loader2, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";

const TrackPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"requesting" | "tracking" | "error">("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const [bgActive, setBgActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; speed: number }>({ lat: 0, lng: 0, speed: 0 });
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-location`;

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
      // Network error — keep trying, don't switch to error state if we were tracking
      console.warn("Network error sending location, will retry...");
    }
  }, [token, FUNCTION_URL]);

  // Request Wake Lock to prevent screen sleep
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setBgActive(true);
        wakeLockRef.current.addEventListener("release", () => {
          setBgActive(false);
        });
      }
    } catch {
      // Wake Lock not supported or denied
    }
  }, []);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && status === "tracking") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, requestWakeLock]);

  // Fallback: resend last known position periodically when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && status === "tracking") {
        // Start fallback interval to resend last known position every 10s
        retryIntervalRef.current = setInterval(() => {
          const { lat, lng, speed } = lastPositionRef.current;
          if (lat !== 0 || lng !== 0) {
            sendLocation(lat, lng, speed);
          }
        }, 10000);
      } else {
        // Clear fallback when page is visible again
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [status, sendLocation]);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid tracking link");
      setStatus("error");
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      setStatus("error");
      return;
    }

    // Request wake lock immediately
    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed ? pos.coords.speed * 3.6 : 0
        );
      },
      (err) => {
        setErrorMsg(err.message);
        setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [token, requestWakeLock, sendLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {status === "requesting" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-foreground">Requesting Location Access</h1>
            <p className="text-sm text-muted-foreground">
              Please allow location access so your position can be shared.
            </p>
            <p className="text-xs text-muted-foreground">
              Keep this page open for continuous tracking.
            </p>
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
            <h1 className="text-xl font-semibold text-foreground">Sharing Your Location</h1>
            <p className="text-sm text-muted-foreground">
              Your GPS position is being shared live. Keep this page open.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>{sendCount} update{sendCount !== 1 ? "s" : ""} sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                {bgActive ? (
                  <>
                    <Wifi className="w-4 h-4 text-primary" />
                    <span>Screen lock active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                    <span>Screen may sleep</span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> Don't close this tab. Your location will continue to be shared even if you switch apps or lock your screen.
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
