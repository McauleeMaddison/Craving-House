"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { apiGetJson } from "@/lib/api";

export function LoyaltyQrClient() {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showLarge, setShowLarge] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function refresh() {
    const res = await apiGetJson<{ cardToken: string }>("/api/loyalty/card");
    if (!res.ok) {
      setToken("");
      setError(res.status === 401 ? "Sign in to view your QR." : res.error);
      return;
    }
    setError("");
    setImgError(false);
    setToken(res.data.cardToken);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function rotate() {
    const res = await fetch("/api/loyalty/card/rotate", { method: "POST" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      setError(json?.error ?? "Could not regenerate QR.");
      return;
    }
    setError("");
    setImgError(false);
    setToken(String(json?.cardToken ?? ""));
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const qrImageUrl = useMemo(() => {
    if (!token) return "";
    const data = encodeURIComponent(token);
    return `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chld=M|0&chl=${data}`;
  }, [token]);

  return (
    <div className="u-mt-12">
      {error ? (
        <p className="muted u-m-0 u-danger">
          {error}
        </p>
      ) : null}

      <div className="loyaltyQrActions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setError("");
            setImgError(false);
            void refresh();
          }}
          type="button"
        >
          Reload
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => void rotate()} disabled={!token}>
          Regenerate QR
        </button>
        <button className="btn btn-secondary" onClick={() => setShowLarge(true)} type="button" disabled={!token}>
          Fullscreen QR
        </button>
        <button className="btn" onClick={copy} type="button" disabled={!token}>
          {copied ? "Copied" : "Copy token"}
        </button>
      </div>

      {token && !imgError ? (
        <div className="qrFrame u-mt-12">
          {/* External QR render for MVP; replace with first-party QR generation later if desired */}
          <Image
            className="qrImage"
            src={qrImageUrl}
            alt="Your loyalty QR code"
            width={240}
            height={240}
            onError={() => setImgError(true)}
            onClick={() => setShowLarge(true)}
          />
          <div className="muted u-fs-12 u-lh-16 u-mt-10">
            Show this QR to staff at collection. If scanning fails, use “Copy token”.
          </div>
        </div>
      ) : null}

      <div className="surface loyaltyTokenBox">
        <div className="muted loyaltyTokenLabel">
          QR token (fallback):
        </div>
        <div className="loyaltyTokenValue">
          {token || "—"}
        </div>
      </div>

      {showLarge && token ? (
        <div className="modalOverlay" role="dialog" aria-label="Loyalty QR" onClick={() => setShowLarge(false)}>
          <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div className="u-fw-900">Your loyalty QR</div>
              <button className="iconButton" type="button" onClick={() => setShowLarge(false)} aria-label="Close">
                <span className="iconX" aria-hidden="true">
                  ×
                </span>
              </button>
            </div>
            {!imgError ? (
              <div className="qrFrame u-mt-12">
                <Image className="qrImage" src={qrImageUrl} alt="Your loyalty QR code" width={360} height={360} />
              </div>
            ) : null}
            <div className="muted u-mt-12 u-lh-16">
              If scanning fails, use “Copy token” and staff can paste it.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
