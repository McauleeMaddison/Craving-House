"use client";

import { useEffect, useMemo, useState } from "react";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const HIDE_UNTIL_KEY = "ch.pwa.install.hide-until.v1";
const HIDE_FOR_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function readHideUntil() {
  if (typeof window === "undefined") return 0;
  const raw = Number(window.localStorage.getItem(HIDE_UNTIL_KEY) ?? "0");
  if (!Number.isFinite(raw)) return 0;
  return raw;
}

function writeHideUntil(until: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDE_UNTIL_KEY, String(until));
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(displayModeStandalone || iosStandalone);

    const hiddenUntil = readHideUntil();
    if (hiddenUntil > Date.now()) setDismissed(true);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const shouldShow = useMemo(() => {
    return Boolean(!isStandalone && !dismissed && deferredPrompt);
  }, [deferredPrompt, dismissed, isStandalone]);

  async function install() {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
        writeHideUntil(Date.now() + 1000 * 60 * 60 * 24 * 365);
      }
    } finally {
      setInstalling(false);
    }
  }

  function dismissForNow() {
    setDismissed(true);
    writeHideUntil(Date.now() + HIDE_FOR_MS);
  }

  if (!shouldShow) return null;

  return (
    <aside className="pwaInstallPrompt surface" role="complementary" aria-label="Install app">
      <div className="pwaInstallPromptTitle">Install Craving House</div>
      <p className="muted pwaInstallPromptCopy">
        Add this app to your home screen for faster launch, push notifications, and a native-like checkout flow.
      </p>
      <div className="rowWrap u-mt-10">
        <button className="btn btnCompact" type="button" onClick={() => void install()} disabled={installing}>
          {installing ? "Opening…" : "Install app"}
        </button>
        <button className="btn btn-secondary btnCompact" type="button" onClick={dismissForNow}>
          Not now
        </button>
      </div>
    </aside>
  );
}
