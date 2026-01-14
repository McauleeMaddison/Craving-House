"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type LoyaltyMeDto = {
  stamps: number;
  rewardsRedeemed: number;
  rewardStamps: number;
};

export function LoyaltySummaryClient() {
  const [data, setData] = useState<LoyaltyMeDto | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<LoyaltyMeDto>("/api/loyalty/me");
      if (!mounted) return;
      if (!res.ok) {
        setError(res.status === 401 ? "Sign in to see your stamps." : res.error);
        setData(null);
        return;
      }
      setError("");
      setData(res.data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const progress = useMemo(() => {
    if (!data) return { filled: 0, total: 5 };
    const total = Math.max(1, data.rewardStamps);
    const filled = Math.min(total, Math.max(0, data.stamps % total));
    return { filled, total };
  }, [data]);

  if (error) {
    return (
      <div style={{ marginTop: 10 }}>
        <p className="muted" style={{ margin: 0, color: "var(--danger)" }}>
          {error}
        </p>
        <a className="btn btn-secondary" href="/signin" style={{ marginTop: 10 }}>
          Sign in
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
        Loading…
      </p>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="rowWrap">
        <span className="pill">
          Stamps: <strong style={{ color: "var(--text)" }}>{data.stamps}</strong>
        </span>
        <span className="pill">
          Rewards redeemed:{" "}
          <strong style={{ color: "var(--text)" }}>{data.rewardsRedeemed}</strong>
        </span>
        <span className="pill">
          Target: <strong style={{ color: "var(--text)" }}>{data.rewardStamps}</strong>
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {Array.from({ length: progress.total }).map((_, i) => {
          const filled = i < progress.filled;
          return (
            <div
              key={i}
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: `1px solid ${filled ? "color-mix(in srgb, var(--accent) 35%, var(--border))" : "var(--border)"}`,
                display: "grid",
                placeItems: "center",
                background: filled
                  ? "color-mix(in srgb, var(--accent) 18%, var(--panel))"
                  : "color-mix(in srgb, var(--panel) 70%, transparent)",
                transition: "transform 140ms ease, background 140ms ease"
              }}
            >
              {filled ? "☕︎" : "•"}
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
        Show your QR at collection and ask staff to stamp your loyalty card.
      </p>
    </div>
  );
}

