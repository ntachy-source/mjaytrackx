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

    // Dynamically import @capacitor/app so web builds don't fail
    import(/* @vite-ignore */ "@capacitor/app")
      .then(({ App }) => {
        backHandlerPromise = App.addListener("backButton", () => {
          // Do nothing — prevent exit when locked
        }) as any;
        resumeHandlerPromise = App.addListener("appStateChange", ({ isActive }) => {
          if (isActive && isLocked) document.body.style.overflow = "hidden";
        }) as any;
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
