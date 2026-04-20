"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IScannerControls } from "@zxing/browser";

import { apiGetJson, apiPostJson } from "@/lib/api";

function randomKey() {
  return `stamp_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function randomRedeemKey() {
  return `redeem_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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

function normalizeDetectedToken(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const queryToken = url.searchParams.get("token") || url.searchParams.get("cardToken") || url.searchParams.get("t");
    if (queryToken?.trim()) return queryToken.trim();
  } catch {
    // not a URL; fall back to raw token text
  }

  return trimmed;
}

function getCameraStartErrorMessage(error: unknown) {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name ?? "")
    : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied. Allow camera access in browser settings or use “Paste token”.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device/browser. You can use “Paste token”.";
  }
  return "Could not start camera scanning on this browser. You can use “Paste token” instead.";
}

export function LoyaltyScanClient() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [cardToken, setCardToken] = useState("");
  const [eligibleItemCount, setEligibleItemCount] = useState<number>(1);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [captureMode, setCaptureMode] = useState<"camera" | "manual">("camera");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scannerSessionRef = useRef(0);
  const scannerHasResultRef = useRef(false);

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
    const mode = searchParams.get("mode");
    setCaptureMode(mode === "manual" ? "manual" : "camera");
  }, [searchParams]);

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
          cardToken,
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

  async function redeem() {
    setStatus("sending");
    setMessage("");
    try {
      const res = await apiPostJson<{ stamps: number; rewardsRedeemed: number; rewardStamps: number | null }>(
        "/api/loyalty/redeem",
        {
          cardToken,
          orderId: orderId || undefined,
          idempotencyKey: randomRedeemKey()
        }
      );
      if (!res.ok) {
        setStatus("error");
        setMessage(res.error ?? "Redeem failed");
        return;
      }
      setStatus("ok");
      setMessage(`Redeemed 1 reward. Remaining stamps: ${res.data.stamps}. Total rewards redeemed: ${res.data.rewardsRedeemed}.`);
    } catch {
      setStatus("error");
      setMessage("Redeem failed");
    }
  }

  async function stopScanner() {
    scannerSessionRef.current += 1;
    scannerHasResultRef.current = false;

    const controls = scannerControlsRef.current;
    scannerControlsRef.current = null;
    if (controls) {
      try {
        controls.stop();
      } catch {
        // ignore stop failures
      }
    }

    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (video) video.srcObject = null;

    setScannerOpen(false);
  }

  async function startScanner() {
    setScannerError("");
    if (captureMode === "manual") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera access is unavailable in this browser. You can use “Paste token”.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setScannerError("Camera scanning requires HTTPS. Open the app using https:// and try again.");
      return;
    }

    try {
      await stopScanner();

      const sessionId = scannerSessionRef.current + 1;
      scannerSessionRef.current = sessionId;
      scannerHasResultRef.current = false;
      setScannerOpen(true);

      let video: HTMLVideoElement | null = null;
      for (let i = 0; i < 20; i++) {
        video = videoRef.current;
        if (video) break;
        await new Promise((resolve) => window.setTimeout(resolve, 25));
      }
      if (!video || scannerSessionRef.current !== sessionId) {
        await stopScanner();
        return;
      }

      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 750
      });

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: {
              ideal: "environment"
            }
          }
        },
        video,
        (result, _error, runtimeControls) => {
          if (scannerSessionRef.current !== sessionId) {
            runtimeControls.stop();
            return;
          }
          if (!result || scannerHasResultRef.current) return;

          const detected = normalizeDetectedToken(result.getText() ?? "");
          if (!detected) return;

          scannerHasResultRef.current = true;
          setCardToken(detected);
          if (navigator.vibrate) navigator.vibrate(30);
          void stopScanner();
        }
      );

      if (scannerSessionRef.current !== sessionId) {
        controls.stop();
        return;
      }
      scannerControlsRef.current = controls;
    } catch (error) {
      setScannerError(getCameraStartErrorMessage(error));
      await stopScanner();
    }
  }

  async function scanFromPhoto(file: File) {
    setScannerError("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const imageUrl = URL.createObjectURL(file);

      try {
        const result = await reader.decodeFromImageUrl(imageUrl);
        const detected = normalizeDetectedToken(result.getText() ?? "");
        if (!detected) {
          setScannerError("QR detected, but no token value was found.");
          return;
        }
        setCardToken(detected);
        if (navigator.vibrate) navigator.vibrate(30);
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    } catch {
      setScannerError("Could not read a QR code from that photo. Try another image or use camera scan.");
    }
  }

  async function pasteFromClipboard() {
    setScannerError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard is unavailable on this device.");
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) throw new Error("Clipboard is empty.");
      setCardToken(value);
    } catch (error: any) {
      setScannerError(String(error?.message ?? "Could not read from clipboard. Paste token manually."));
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <section className="surface u-pad-18">
      <h1 className="u-title-26">Loyalty scan</h1>
      <p className="muted u-mt-10 u-lh-16">
        Staff or managers scan the customer QR after collection and submit the number of eligible coffees. This calls the secure server route.
      </p>

      <div className="grid-2 u-mt-14">
        <div className="surface surfaceInset u-pad-16">
          <div className="u-fw-800">Order (optional)</div>
          <p className="muted u-mt-8 u-lh-16">
            Link stamping to an order for audit/history.
          </p>
          <select
            className="input u-mt-10"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            aria-label="Order"
          >
            <option value="">No order selected</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.pickupName} • {o.status} • {new Date(o.createdAtIso).toLocaleString("en-GB", { timeStyle: "short", dateStyle: "medium" })}
              </option>
            ))}
          </select>

          {selected ? (
            <div className="pill u-mt-10">
              Eligible coffees in order: {eligibleCount(selected)}
            </div>
          ) : null}
        </div>

        <div className="surface surfaceInset u-pad-16">
          <div className="u-fw-800">Stamp</div>
          <label className="u-grid-gap-8 u-mt-10">
            <span className="muted u-fs-13">
              Customer QR token
            </span>
            <div className="checkoutModeRow">
              <button
                className={`btn btn-secondary btnCompact ${captureMode === "camera" ? "btnActive" : ""}`}
                type="button"
                onClick={() => setCaptureMode("camera")}
              >
                Camera scan
              </button>
              <button
                className={`btn btn-secondary btnCompact ${captureMode === "manual" ? "btnActive" : ""}`}
                type="button"
                onClick={() => setCaptureMode("manual")}
              >
                Manual/paste
              </button>
            </div>
            <input
              className="input"
              value={cardToken}
              onChange={(e) => setCardToken(e.target.value)}
              placeholder="Paste scanned token"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <div className="rowWrap u-mt-10 u-justify-between">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={startScanner}
              disabled={captureMode !== "camera"}
            >
              {captureMode === "camera" ? "Scan with camera" : "Camera disabled"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => void pasteFromClipboard()}>
              Paste from clipboard
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => photoInputRef.current?.click()}>
              Scan from photo
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setCardToken("")} disabled={!cardToken}>
              Clear
            </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void scanFromPhoto(file);
              e.currentTarget.value = "";
            }}
          />
          {captureMode === "manual" ? (
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              Manual mode is optimised for low-end devices. Paste the token instead of opening the camera.
            </p>
          ) : null}
          {scannerError ? (
            <p className="muted u-mt-10 u-danger">
              {scannerError}
            </p>
          ) : null}
          <label className="u-grid-gap-8 u-mt-10">
            <span className="muted u-fs-13">
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
            className="btn u-mt-12 u-w-full"
            onClick={submit}
            disabled={status === "sending" || cardToken.trim().length === 0 || eligibleItemCount <= 0}
          >
            {status === "sending" ? "Stamping..." : "Add stamps"}
          </button>

          <button
            className="btn btn-secondary u-mt-10 u-w-full"
            onClick={redeem}
            disabled={status === "sending" || cardToken.trim().length === 0}
            type="button"
          >
            {status === "sending" ? "Processing..." : "Redeem 1 free coffee"}
          </button>

          {message ? (
            <p
              className={`muted u-mt-10 ${status === "error" ? "u-danger" : ""}`}
            >
              {message}
            </p>
          ) : null}

          <p className="muted u-mt-10 u-fs-12 u-lh-16">
            If you see “Unauthorized/Forbidden”, make sure you are signed in and your account role is <code>staff</code> or <code>manager</code>.
          </p>
        </div>
      </div>

      {scannerOpen ? (
        <div className="modalOverlay" role="dialog" aria-label="Scan QR" onClick={() => void stopScanner()}>
          <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="u-fw-900">Scan customer QR</div>
              <button className="iconButton" type="button" onClick={() => void stopScanner()} aria-label="Close">
                <span className="iconX" aria-hidden="true">
                  ×
                </span>
              </button>
            </div>
            <div className="cameraFrame u-mt-12">
              <video ref={videoRef} className="cameraVideo" playsInline muted />
              <div className="cameraHint muted">Center the QR inside the frame</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
