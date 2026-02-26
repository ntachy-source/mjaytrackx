import { useCallback, useEffect, useRef } from "react";

export const usePushNotifications = () => {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === "granted";
  }, []);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch {
      // Notification constructor may fail in some contexts
    }
  }, []);

  return { requestPermission, notify };
};
