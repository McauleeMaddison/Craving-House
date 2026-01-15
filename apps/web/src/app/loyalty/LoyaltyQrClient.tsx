"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

export function LoyaltyQrClient() {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showLarge, setShowLarge] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function refresh() {
    setError("");
    setImgError(false);
    const res = await apiGetJson<{ token: string; expiresInSeconds: number }>("/api/loyalty/qr");
    if (!res.ok) {
      setToken("");
      setError(res.status === 401 ? "Sign in to view your QR." : res.error);
      return;
    }
    setToken(res.data.token);
  }

  useEffect(() => {
    void refresh();
  }, []);

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
    <div style={{ marginTop: 12 }}>
      {error ? (
        <p className="muted" style={{ margin: 0, color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button className="btn btn-secondary" onClick={refresh} type="button">
          Refresh QR
        </button>
        <button className="btn btn-secondary" onClick={() => setShowLarge(true)} type="button" disabled={!token}>
          Fullscreen QR
        </button>
        <button className="btn" onClick={copy} type="button" disabled={!token}>
          {copied ? "Copied" : "Copy token"}
        </button>
      </div>

      {token && !imgError ? (
        <div className="qrFrame" style={{ marginTop: 12 }}>
          {/* External QR render for MVP; replace with first-party QR generation later if desired */}
          <img
            className="qrImage"
            src={qrImageUrl}
            alt="Your loyalty QR code"
            loading="lazy"
            onError={() => setImgError(true)}
            onClick={() => setShowLarge(true)}
          />
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
            Show this QR to staff at collection. If scanning fails, use “Copy token”.
          </div>
        </div>
      ) : null}

      <div
        className="surface"
        style={{
          marginTop: 12,
          padding: 12,
          background: "rgba(0,0,0,0.22)",
          boxShadow: "none",
          overflow: "hidden"
        }}
      >
        <div className="muted" style={{ fontSize: 12 }}>
          QR token (fallback):
        </div>
        <div style={{ marginTop: 8, wordBreak: "break-all", fontSize: 12 }}>
          {token || "—"}
        </div>
      </div>

      {showLarge && token ? (
        <div className="modalOverlay" role="dialog" aria-label="Loyalty QR" onClick={() => setShowLarge(false)}>
          <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div style={{ fontWeight: 900 }}>Your loyalty QR</div>
              <button className="iconButton" type="button" onClick={() => setShowLarge(false)} aria-label="Close">
                <span style={{ fontSize: 22, lineHeight: 1, transform: "translateY(-1px)" }}>×</span>
              </button>
            </div>
            {!imgError ? (
              <div className="qrFrame" style={{ marginTop: 12 }}>
                <img className="qrImage" src={qrImageUrl} alt="Your loyalty QR code" />
              </div>
            ) : null}
            <div className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
              If scanning fails, use “Copy token” and staff can paste it.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
