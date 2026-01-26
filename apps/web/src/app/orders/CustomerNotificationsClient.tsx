"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function CustomerNotificationsClient() {
  const [status, setStatus] = useState<"unknown" | "unsupported" | "blocked" | "enabled" | "disabled" | "working">("unknown");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    void (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "enabled" : "disabled");
    })();
  }, []);

  async function enable() {
    setError("");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    setStatus("working");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setStatus(perm === "denied" ? "blocked" : "disabled");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyJson = (await keyRes.json().catch(() => null)) as any;
      const publicKey = String(keyJson?.publicKey ?? "");
      if (!keyRes.ok || !publicKey) throw new Error(keyJson?.error ?? "Notifications not configured yet");

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));

      const payload = sub.toJSON() as any;
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: payload })
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.error ?? "Could not enable notifications");

      setStatus("enabled");
    } catch (e: any) {
      setError(String(e?.message ?? "Could not enable notifications"));
      setStatus("disabled");
    }
  }

  async function disable() {
    setError("");
    if (!("serviceWorker" in navigator)) return;
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint })
        });
      }
      setStatus("disabled");
    } catch (e: any) {
      setError(String(e?.message ?? "Could not disable notifications"));
      setStatus("enabled");
    }
  }

  return (
    <div className="surface surfaceInset u-pad-14 u-mt-12">
      <div className="u-flex-between-wrap">
        <div>
          <div className="u-fw-900">Ready notifications</div>
          <div className="muted u-mt-6 u-fs-13 u-lh-16">
            Get a push notification when staff marks your order as ready to collect.
          </div>
        </div>
        <span className="pill">
          {status === "enabled"
            ? "Enabled"
            : status === "disabled"
              ? "Off"
              : status === "blocked"
                ? "Blocked"
                : status === "unsupported"
                  ? "Unsupported"
                  : status === "working"
                    ? "Working…"
                    : "—"}
        </span>
      </div>

      {error ? <p className="muted u-danger u-mt-10">{error}</p> : null}

      {status === "unsupported" ? (
        <p className="muted u-mt-10 u-lh-16">
          Push notifications aren’t supported in this browser. Try Chrome/Edge on desktop or Android. On iPhone/iPad, install the app to your Home Screen.
        </p>
      ) : status === "blocked" ? (
        <p className="muted u-mt-10 u-lh-16">
          Notifications are blocked in your browser settings for this site.
        </p>
      ) : (
        <div className="rowWrap u-mt-10">
          <button className="btn" type="button" onClick={() => void enable()} disabled={status === "working" || status === "enabled"}>
            Enable notifications
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => void disable()} disabled={status === "working" || status !== "enabled"}>
            Disable
          </button>
        </div>
      )}
    </div>
  );
}

