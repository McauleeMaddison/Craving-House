"use client";

import { useEffect, useState } from "react";

import { apiGetJson } from "@/lib/api";
import { ManagerMfaClient } from "@/app/manager/settings/ManagerMfaClient";

export function SettingsClient() {
  const [rewardStamps, setRewardStamps] = useState<number>(5);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ rewardStamps: number }>("/api/manager/loyalty-settings");
      if (!mounted) return;
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      setRewardStamps(res.data.rewardStamps);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/manager/loyalty-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rewardStamps })
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        setStatus("error");
        setError(json?.error || "Save failed");
        return;
      }
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      setError("Save failed");
    }
  }

  return (
    <section className="surface u-pad-18">
      <h1 className="u-title-26">Settings</h1>
      <p className="muted u-mt-10 u-lh-16">
        Control loyalty rules that affect all customers.
      </p>

      <ManagerMfaClient />

      <div className="surface surfaceInset u-pad-16 u-mt-14">
        <div className="u-fw-900">Loyalty</div>
        <p className="muted u-mt-8 u-lh-16">
          “Buy N eligible coffees, get 1 reward”.
        </p>

        <label className="u-grid-gap-8 u-mt-12">
          <span className="muted u-fs-13">Reward stamps (N)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={20}
            value={rewardStamps}
            onChange={(e) => setRewardStamps(Number(e.target.value))}
          />
        </label>

        <div className="u-flex-wrap-gap-10 u-mt-12">
          <button className="btn" type="button" onClick={save} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          <div className="pill">
            Current rule: buy {rewardStamps} eligible coffees → 1 reward
          </div>
        </div>

        {error ? (
          <p className="muted u-mt-10 u-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
