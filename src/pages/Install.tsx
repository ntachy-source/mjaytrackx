import { useEffect, useState } from "react";
import { Download, CheckCircle, Share, MoreVertical, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <button onClick={() => navigate("/")} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {installed ? (
          <>
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">App Installed!</h1>
            <p className="text-muted-foreground text-sm">
              Track X is installed on your device. Open it from your home screen for the best tracking experience.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Dashboard
            </Button>
          </>
        ) : isIOS ? (
          <>
            <Download className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Install Track X</h1>
            <p className="text-muted-foreground text-sm">
              Install for better background GPS tracking and a native app experience.
            </p>
            <div className="text-left space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground font-medium">On iPhone / iPad:</p>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Share className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                <span>Tap the <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Download className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                <span>Select <strong>"Add to Home Screen"</strong></span>
              </div>
            </div>
          </>
        ) : (
          <>
            <Download className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Install Track X</h1>
            <p className="text-muted-foreground text-sm">
              Install for better background GPS tracking and a native app experience.
            </p>
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            ) : (
              <div className="text-left space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-foreground font-medium">On Android:</p>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MoreVertical className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <span>Tap the <strong>menu (⋮)</strong> in your browser</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Download className="w-5 h-5 mt-0.5 shrink-0 text-primary" />
                  <span>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Install;
