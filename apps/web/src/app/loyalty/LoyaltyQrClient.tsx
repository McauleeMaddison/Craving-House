"use client";

import { useEffect, useState } from "react";

import { apiGetJson } from "@/lib/api";

export function LoyaltyQrClient() {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setError("");
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
        <button className="btn" onClick={copy} type="button" disabled={!token}>
          {copied ? "Copied" : "Copy token"}
        </button>
      </div>

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
          (Temporary) QR token:
        </div>
        <div style={{ marginTop: 8, wordBreak: "break-all", fontSize: 12 }}>
          {token || "—"}
        </div>
      </div>
    </div>
  );
}

