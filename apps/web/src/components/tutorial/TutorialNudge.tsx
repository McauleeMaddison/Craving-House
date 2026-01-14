"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function TutorialNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("ch.tutorial.dismissed");
    if (dismissed === "true") return;
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="surface"
      style={{
        position: "fixed",
        left: 14,
        right: 14,
        bottom: 14,
        zIndex: 20,
        padding: 12,
        boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
        maxWidth: 920,
        margin: "0 auto"
      }}
      role="dialog"
      aria-label="Quick guide"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        <div>
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>New here?</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
            Use Menu → Cart → Checkout. Toggle dark mode in the menu.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-secondary" href="/help">
            Quick guide
          </Link>
          <button
            className="btn"
            type="button"
            onClick={() => {
              window.localStorage.setItem("ch.tutorial.dismissed", "true");
              setVisible(false);
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
