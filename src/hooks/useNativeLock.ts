import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * On native platforms, prevents the user from dismissing the lock screen
 * by intercepting the hardware back button and keeping the app in foreground.
 */
export const useNativeLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked || !Capacitor.isNativePlatform()) return;

    // Block hardware back button on Android
    const backHandler = App.addListener("backButton", (e) => {
      // Do nothing — prevent exit when locked
    });

    // When app returns to foreground while locked, ensure overlay stays
    const resumeHandler = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && isLocked) {
        // Force focus back — the lock overlay is already rendered
        document.body.style.overflow = "hidden";
      }
    });

    // Prevent scrolling / interaction behind overlay
    document.body.style.overflow = "hidden";

    return () => {
      backHandler.then((h) => h.remove());
      resumeHandler.then((h) => h.remove());
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};
