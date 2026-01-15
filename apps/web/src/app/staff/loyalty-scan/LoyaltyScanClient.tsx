"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiGetJson, apiPostJson } from "@/lib/api";

function randomKey() {
  return `stamp_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type StaffOrderDto = {
  id: string;
  pickupName: string;
  status: string;
  createdAtIso: string;
  lines: Array<{ qty: number; loyaltyEligible: boolean }>;
};

function eligibleCount(order: StaffOrderDto) {
  return order.lines.reduce((sum, l) => sum + (l.loyaltyEligible ? l.qty : 0), 0);
}

export function LoyaltyScanClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [qrToken, setQrToken] = useState("");
  const [eligibleItemCount, setEligibleItemCount] = useState<number>(1);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders");
      if (!mounted) return;
      if (res.ok) setOrders(res.data.orders);
      else setOrders([]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);

  useEffect(() => {
    if (!selected) return;
    const count = eligibleCount(selected);
    if (count > 0) setEligibleItemCount(count);
  }, [selected]);

  async function submit() {
    setStatus("sending");
    setMessage("");
    try {
      const res = await apiPostJson<{ earned: number; totalStamps: number }>(
        "/api/loyalty/stamp",
        {
          qrToken,
          eligibleItemCount,
          orderId: orderId || undefined,
          idempotencyKey: randomKey()
        }
      );
      if (!res.ok) {
        setStatus("error");
        setMessage(res.error ?? "Stamp failed");
        return;
      }
      setStatus("ok");
      setMessage(`Stamped. Earned: ${res.data.earned}, total stamps: ${res.data.totalStamps}.`);
    } catch {
      setStatus("error");
      setMessage("Stamp failed");
    }
  }

  async function stopScanner() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    setScannerOpen(false);
  }

  async function startScanner() {
    setScannerError("");

    const BarcodeDetectorCtor = (window as any).BarcodeDetector as
      | (new (opts?: { formats?: string[] }) => { detect: (image: CanvasImageSource) => Promise<any[]> })
      | undefined;
    if (!BarcodeDetectorCtor) {
      setScannerError("Camera scanning isn’t supported on this device/browser. Use “Paste token”.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      setScannerOpen(true);

      // Wait a tick for the video element to exist
      setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
      }, 0);

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          if (!codes || codes.length === 0) return;
          const value = codes[0]?.rawValue ?? codes[0]?.data ?? "";
          if (!value) return;

          setQrToken(String(value));
          if (navigator.vibrate) navigator.vibrate(30);
          await stopScanner();
        } catch {
          // ignore transient detect errors
        }
      }, 220);
    } catch {
      setScannerError("Camera permission denied or unavailable. You can paste the token instead.");
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="surface" style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 26 }}>Loyalty scan</h1>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
        Staff scan the customer QR after collection and submit the number of eligible coffees. This calls the secure server route.
      </p>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div style={{ fontWeight: 800 }}>Order (optional)</div>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Link stamping to an order for audit/history.
          </p>
          <select
            className="input"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            aria-label="Order"
            style={{ marginTop: 10 }}
          >
            <option value="">No order selected</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.pickupName} • {o.status} • {new Date(o.createdAtIso).toLocaleString("en-GB", { timeStyle: "short", dateStyle: "medium" })}
              </option>
            ))}
          </select>

          {selected ? (
            <div className="pill" style={{ marginTop: 10 }}>
              Eligible coffees in order: {eligibleCount(selected)}
            </div>
          ) : null}
        </div>

        <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div style={{ fontWeight: 800 }}>Stamp</div>
          <label style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Customer QR token
            </span>
            <input
              className="input"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Paste scanned token"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <div className="rowWrap" style={{ marginTop: 10, justifyContent: "space-between" }}>
            <button className="btn btn-secondary" type="button" onClick={startScanner}>
              Scan with camera
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setQrToken("")} disabled={!qrToken}>
              Clear
            </button>
          </div>
          {scannerError ? (
            <p className="muted" style={{ marginTop: 10, color: "var(--danger)" }}>
              {scannerError}
            </p>
          ) : null}
          <label style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Eligible coffees
            </span>
            <input
              className="input"
              type="number"
              min={1}
              value={eligibleItemCount}
              onChange={(e) => setEligibleItemCount(Number(e.target.value))}
            />
          </label>

          <button
            className="btn"
            style={{ marginTop: 12, width: "100%" }}
            onClick={submit}
            disabled={status === "sending" || qrToken.trim().length === 0 || eligibleItemCount <= 0}
          >
            {status === "sending" ? "Stamping..." : "Add stamps"}
          </button>

          {message ? (
            <p
              className="muted"
              style={{
                marginTop: 10,
                color: status === "error" ? "var(--danger)" : "var(--muted)"
              }}
            >
              {message}
            </p>
          ) : null}

          <p className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6 }}>
            If you see “Unauthorized/Forbidden”, make sure you are signed in and your account role is <code>staff</code> or <code>manager</code>.
          </p>
        </div>
      </div>

      {scannerOpen ? (
        <div className="modalOverlay" role="dialog" aria-label="Scan QR" onClick={() => void stopScanner()}>
          <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div style={{ fontWeight: 900 }}>Scan customer QR</div>
              <button className="iconButton" type="button" onClick={() => void stopScanner()} aria-label="Close">
                <span style={{ fontSize: 22, lineHeight: 1, transform: "translateY(-1px)" }}>×</span>
              </button>
            </div>
            <div className="cameraFrame" style={{ marginTop: 12 }}>
              <video ref={videoRef} className="cameraVideo" playsInline muted />
              <div className="cameraHint muted">Center the QR inside the frame</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
