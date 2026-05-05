import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * On native platforms, prevents the user from dismissing the lock screen
 * by intercepting the hardware back button and keeping the app in foreground.
 */
export const useNativeLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked || !Capacitor.isNativePlatform()) return;

    let backHandlerPromise: Promise<{ remove: () => void }> | null = null;
    let resumeHandlerPromise: Promise<{ remove: () => void }> | null = null;

    // Runtime lookup so web bundle doesn't try to resolve @capacitor/app
    const modName = "@capacitor/app";
    (new Function("m", "return import(m)"))(modName)
      .then((mod: any) => {
        const App = mod.App;
        backHandlerPromise = App.addListener("backButton", () => {});
        resumeHandlerPromise = App.addListener("appStateChange", ({ isActive }: any) => {
          if (isActive && isLocked) document.body.style.overflow = "hidden";
        });
      })
      .catch(() => {});

    document.body.style.overflow = "hidden";

    return () => {
      backHandlerPromise?.then((h) => h.remove()).catch(() => {});
      resumeHandlerPromise?.then((h) => h.remove()).catch(() => {});
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};
