import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

/**
 * Request native geolocation permissions on Capacitor platforms.
 * Falls back to browser geolocation on web.
 */
export const requestNativeLocationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true; // web handles via browser API

  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted" || status.coarseLocation === "granted") {
      return true;
    }

    const result = await Geolocation.requestPermissions();
    return result.location === "granted" || result.coarseLocation === "granted";
  } catch {
    return false;
  }
};
