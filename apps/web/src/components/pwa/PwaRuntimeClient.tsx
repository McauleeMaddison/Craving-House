"use client";

import { useEffect, useState } from "react";

export function PwaRuntimeClient() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOffline(!navigator.onLine);

    function onOnline() {
      setOffline(false);
    }

    function onOffline() {
      setOffline(true);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="pwaOfflineBanner" role="status" aria-live="polite">
      You are offline. Some live data may be unavailable.
    </div>
  );
}
