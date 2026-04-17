"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type StaffOrderDto = {
  id: string;
  createdAtIso: string;
  status: "received" | "accepted" | "ready" | "collected" | "canceled";
};

function minutesSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function StaffDashboardClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [error, setError] = useState("");
  const [pushStatus, setPushStatus] = useState<"unknown" | "unsupported" | "blocked" | "enabled" | "disabled" | "working">("unknown");
  const [pushError, setPushError] = useState("");

  async function refresh() {
    const res = await apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders");
    if (!res.ok) {
      setError(res.status === 401 ? "Please sign in." : res.error);
      setOrders([]);
      return;
    }
    setError("");
    setOrders(res.data.orders);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushStatus("blocked");
      return;
    }
    void (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPushStatus(sub ? "enabled" : "disabled");
    })();
  }, []);

  async function enablePush() {
    setPushError("");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    setPushStatus("working");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setPushStatus(perm === "denied" ? "blocked" : "disabled");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyJson = (await keyRes.json().catch(() => null)) as any;
      const publicKey = String(keyJson?.publicKey ?? "");
      if (!keyRes.ok || !publicKey) throw new Error(keyJson?.error ?? "Missing VAPID public key");

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
      if (!res.ok) throw new Error(json?.error ?? "Could not save subscription");

      setPushStatus("enabled");
    } catch (e: any) {
      setPushError(String(e?.message ?? "Could not enable notifications"));
      setPushStatus("disabled");
    }
  }

  async function disablePush() {
    setPushError("");
    if (!("serviceWorker" in navigator)) return;
    setPushStatus("working");
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
      setPushStatus("disabled");
    } catch (e: any) {
      setPushError(String(e?.message ?? "Could not disable notifications"));
      setPushStatus("enabled");
    }
  }

  const stats = useMemo(() => {
    const received = orders.filter((o) => o.status === "received").length;
    const accepted = orders.filter((o) => o.status === "accepted").length;
    const ready = orders.filter((o) => o.status === "ready").length;
    const oldestIso = orders.length ? orders.map((o) => o.createdAtIso).sort()[0] : "";
    return { received, accepted, ready, oldestIso };
  }, [orders]);

  return (
    <section className="dashboardSection u-mt-12">
      {error ? <p className="muted u-danger">{error}</p> : null}

      <div className="dashboardStats dashboardStatsThree">
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Received</div>
          <div className="dashboardStatValue">{stats.received}</div>
          <div className="dashboardStatHint">New orders waiting</div>
        </div>
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">In progress</div>
          <div className="dashboardStatValue">{stats.accepted}</div>
          <div className="dashboardStatHint">Accepted orders</div>
        </div>
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Ready</div>
          <div className="dashboardStatValue">{stats.ready}</div>
          <div className="dashboardStatHint">
            Oldest: {stats.oldestIso ? `${minutesSince(stats.oldestIso)} min ago` : "—"}
          </div>
        </div>
      </div>

      <div className="dashboardRefreshRow">
        <button
          className="btn btn-secondary btnCompact"
          type="button"
          onClick={() => {
            setError("");
            void refresh();
          }}
        >
          Refresh stats
        </button>
      </div>

      <div className="widgetCard dashboardDetailCard">
        <div className="dashboardDetailHeader">
          <div>
            <div className="dashboardDetailTitle">Notifications</div>
            <div className="dashboardDetailSub">
              Get a push notification when a new order is received.
            </div>
          </div>
          <div className="rowWrap">
            <span className="pill">
              {pushStatus === "enabled"
                ? "Enabled"
                : pushStatus === "disabled"
                  ? "Off"
                  : pushStatus === "blocked"
                    ? "Blocked"
                    : pushStatus === "unsupported"
                      ? "Unsupported"
                      : pushStatus === "working"
                        ? "Working…"
                        : "—"}
            </span>
          </div>
        </div>

        {pushError ? <p className="muted u-danger">{pushError}</p> : null}

        {pushStatus === "unsupported" ? (
          <p className="dashboardDetailBody">
            This browser doesn’t support push notifications. Try Chrome/Edge on desktop or Android. On iPhone/iPad, push works when the app is installed to the Home Screen.
          </p>
        ) : pushStatus === "blocked" ? (
          <p className="dashboardDetailBody">
            Notifications are blocked in your browser settings for this site.
          </p>
        ) : (
          <div className="rowWrap">
            <button className="btn btnCompact" type="button" onClick={() => void enablePush()} disabled={pushStatus === "working" || pushStatus === "enabled"}>
              Enable notifications
            </button>
            <button className="btn btn-secondary btnCompact" type="button" onClick={() => void disablePush()} disabled={pushStatus === "working" || pushStatus !== "enabled"}>
              Disable
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
