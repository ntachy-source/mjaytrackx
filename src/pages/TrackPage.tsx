import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react";

const TrackPage = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"requesting" | "tracking" | "error">("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-location`;

  const sendLocation = async (lat: number, lng: number, speed?: number) => {
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lat, lng, speed: speed ?? 0 }),
      });
      if (res.ok) {
        setSendCount((c) => c + 1);
        setStatus("tracking");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to send location");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error");
      setStatus("error");
    }
  };

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
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [token]);

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
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{sendCount} update{sendCount !== 1 ? "s" : ""} sent</span>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Error</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackPage;
