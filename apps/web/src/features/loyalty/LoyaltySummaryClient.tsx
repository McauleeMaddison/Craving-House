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
      <div className="u-mt-10">
        <p className="muted u-m-0 u-danger">
          {error}
        </p>
        <a className="btn btn-secondary u-mt-10" href="/signin">
          Sign in
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="muted u-mt-10 u-lh-16">
        Loading…
      </p>
    );
  }

  return (
    <div className="u-mt-10">
      <div className="rowWrap">
        <span className="pill">
          Stamps: <strong className="u-text">{data.stamps}</strong>
        </span>
        <span className="pill">
          Rewards redeemed:{" "}
          <strong className="u-text">{data.rewardsRedeemed}</strong>
        </span>
        <span className="pill">
          Target: <strong className="u-text">{data.rewardStamps}</strong>
        </span>
      </div>

      <div className="loyaltyStampGrid">
        {Array.from({ length: progress.total }).map((_, i) => {
          const filled = i < progress.filled;
          return (
            <div
              key={i}
              aria-hidden="true"
              className={`loyaltyStamp ${filled ? "loyaltyStampFilled" : ""}`}
            >
              {filled ? "☕︎" : "•"}
            </div>
          );
        })}
      </div>

      <p className="muted u-mt-10 u-lh-16">
        Show your QR at collection and ask staff to stamp your loyalty card.
      </p>
    </div>
  );
}
