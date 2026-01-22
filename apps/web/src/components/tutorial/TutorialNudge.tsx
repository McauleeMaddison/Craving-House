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
      className="surface tutorialNudge"
      role="dialog"
      aria-label="Quick guide"
    >
      <div className="tutorialNudgeInner">
        <div>
          <div className="tutorialNudgeTitle">New here?</div>
          <div className="muted tutorialNudgeBody">
            Use Menu → Cart → Checkout. Toggle dark mode in the menu.
          </div>
        </div>
        <div className="tutorialNudgeActions">
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
