"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { store } from "@/lib/store";

const links: Array<{ href: string; label: string }> = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/orders", label: "Orders" },
  { href: "/feedback", label: "Feedback" }
];

export function AppHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const canUseStaff = role === "staff" || role === "manager";
  const canUseManager = role === "manager";
  const isPortal = pathname?.startsWith("/staff") || pathname?.startsWith("/manager");
  const portalCallbackUrl = useMemo(() => {
    if (!pathname) return "/staff";
    if (pathname.startsWith("/manager")) return pathname;
    if (pathname.startsWith("/staff")) return pathname;
    return "/staff";
  }, [pathname]);
  const displayName = useMemo(() => {
    const user = data?.user as any;
    const name = typeof user?.name === "string" ? user.name.trim() : "";
    const email = typeof user?.email === "string" ? user.email.trim() : "";
    if (name) return name;
    if (email) return email.split("@")[0] || "Account";
    return "Account";
  }, [data?.user]);

  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"poster" | "dark">("poster");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [heat, setHeat] = useState(0);
  const [overheatedUntil, setOverheatedUntil] = useState(0);
  const [roundEndAt, setRoundEndAt] = useState(0);
  const [bonusUntil, setBonusUntil] = useState(0);
  const [tapKey, setTapKey] = useState(0);
  const [bonusKey, setBonusKey] = useState(0);
  const tickRef = useRef<{ t: number } | null>(null);
  const bestScoreRef = useRef(0);
  const bestStreakRef = useRef(0);

  useEffect(() => {
    const stored = window.localStorage.getItem("ch.theme");
    if (stored === "dark" || stored === "poster") {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
      return;
    }
    document.documentElement.dataset.theme = "poster";
  }, []);

  function toggleTheme() {
    const next = theme === "poster" ? "dark" : "poster";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("ch.theme", next);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    try {
      const storedBest = window.localStorage.getItem("ch.game.bestScore");
      const storedBestLegacy = window.localStorage.getItem("ch.game.score");
      const n = storedBest ? Number(storedBest) : storedBestLegacy ? Number(storedBestLegacy) : 0;
      if (Number.isFinite(n) && n >= 0) {
        setBestScore(n);
        bestScoreRef.current = n;
      }

      const storedBestStreak = window.localStorage.getItem("ch.game.bestStreak");
      const s = storedBestStreak ? Number(storedBestStreak) : 0;
      if (Number.isFinite(s) && s >= 0) {
        setBestStreak(s);
        bestStreakRef.current = s;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("ch.game.bestScore", String(bestScore));
    } catch {
      // ignore
    }
  }, [bestScore]);

  useEffect(() => {
    try {
      window.localStorage.setItem("ch.game.bestStreak", String(bestStreak));
    } catch {
      // ignore
    }
  }, [bestStreak]);

  const activeHref = useMemo(() => {
    return links.find((l) => pathname?.startsWith(l.href))?.href ?? "";
  }, [pathname]);

  const portalLinks = useMemo(() => {
    if (!canUseStaff) return [];
    const list: Array<{ href: string; label: string }> = [
      { href: "/staff/orders", label: "Order queue" },
      { href: "/staff/loyalty-scan", label: "Loyalty scan" }
    ];
    if (canUseManager) list.push({ href: "/manager", label: "Manager" });
    return list;
  }, [canUseManager, canUseStaff]);

  const drawerLinks = useMemo(() => {
    if (isPortal) return portalLinks;
    return links.map((l) => {
      if (signedIn && l.href === "/loyalty") return { ...l, label: "My QR (loyalty)" };
      if (signedIn && l.href === "/orders") return { ...l, label: "Track orders" };
      return l;
    });
  }, [isPortal, portalLinks, signedIn]);

  const isRunning = roundEndAt > 0 && Date.now() < roundEndAt;
  const timeLeftMs = Math.max(0, roundEndAt - Date.now());
  const timeLeftLabel = `${Math.ceil(timeLeftMs / 1000)}s`;
  const overheated = Date.now() < overheatedUntil;
  const bonusActive = Date.now() < bonusUntil;

  // Mini-game tuning (easy)
  const ROUND_MS = 30_000;
  const BONUS_MS = 1_800;
  const BONUS_POINTS = 12;
  const OVERHEAT_COOLDOWN_MS = 900;
  const HEAT_GAIN_PER_TAP = 9;
  const HEAT_COOL_PER_SEC = 22;
  const HEAT_BONUS_COOL = 22;
  const STREAK_PER_MULTIPLIER = 8;
  const MAX_MULTIPLIER = 5;

  useEffect(() => {
    if (!open) return;
    if (!roundEndAt) return;

    tickRef.current = { t: Date.now() };
    const interval = window.setInterval(() => {
      const now = Date.now();
      const prev = tickRef.current?.t ?? now;
      const dt = Math.min(400, Math.max(0, now - prev));
      tickRef.current = { t: now };

      setHeat((h) => {
        const cooled = Math.max(0, h - HEAT_COOL_PER_SEC * (dt / 1000));
        return Math.min(100, cooled);
      });

      if (now >= roundEndAt) {
        setRoundEndAt(0);
        setBonusUntil(0);
        setOverheatedUntil(0);
        setMultiplier(1);
        setHeat(0);
        setStreak(0);
        setBestScore((cur) => {
          const next = Math.max(cur, score);
          bestScoreRef.current = next;
          return next;
        });
        setBestStreak((cur) => {
          const next = Math.max(cur, streak);
          bestStreakRef.current = next;
          return next;
        });
        return;
      }

      setBonusUntil((cur) => {
        if (cur && now < cur) return cur;
        const secondsLeft = (roundEndAt - now) / 1000;
        if (secondsLeft <= 2.5) return 0;
        const chancePerTick = 0.03; // easier: more frequent bonuses
        if (Math.random() < chancePerTick) {
          setBonusKey((k) => k + 1);
          return now + BONUS_MS;
        }
        return 0;
      });
    }, 120);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roundEndAt, score, streak]);

  function startRound() {
    const now = Date.now();
    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setHeat(0);
    setOverheatedUntil(0);
    setBonusUntil(0);
    setTapKey((k) => k + 1);
    setRoundEndAt(now + ROUND_MS);
  }

  function tapSteam() {
    if (!roundEndAt || !isRunning) {
      startRound();
      return;
    }
    const now = Date.now();
    if (now < overheatedUntil) return;

    setTapKey((k) => k + 1);
    setScore((s) => s + multiplier);
    setStreak((s) => {
      const nextStreak = s + 1;
      setMultiplier((m) => {
        if (m >= MAX_MULTIPLIER) return m;
        if (nextStreak > 0 && nextStreak % STREAK_PER_MULTIPLIER === 0) return m + 1;
        return m;
      });
      return nextStreak;
    });
    setHeat((h) => {
      const next = Math.min(100, h + HEAT_GAIN_PER_TAP);
      if (next >= 100) {
        setOverheatedUntil(now + OVERHEAT_COOLDOWN_MS);
        setMultiplier(1);
        setStreak(0);
      }
      return next;
    });
  }

  function tapBonus() {
    const now = Date.now();
    if (!roundEndAt || !isRunning) return;
    if (now >= bonusUntil) return;
    setBonusKey((k) => k + 1);
    setBonusUntil(0);
    setScore((s) => s + BONUS_POINTS * multiplier);
    setHeat((h) => Math.max(0, h - HEAT_BONUS_COOL));
  }

  return (
    <>
      <header className="appHeader">
        <div className="container appHeaderInner">
          <Link href="/" className="brandLink" aria-label={store.name}>
            <span className="brandMark" aria-hidden="true">
              <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} priority />
            </span>
            <span className="brandText">
              <span className="brandName">{isPortal ? "Staff Portal" : store.name}</span>
              <span className="brandTag muted">{isPortal ? "staff & management only" : store.tagline}</span>
            </span>
          </Link>

          <nav className="navDesktop" aria-label="Primary">
            {isPortal
              ? portalLinks.map((link) => (
                  <Link
                    key={link.href}
                    className={`btn btn-secondary ${pathname?.startsWith(link.href) ? "btnActive" : ""}`}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))
              : links.map((link) => (
                  <Link
                    key={link.href}
                    className={`btn btn-secondary ${activeHref === link.href ? "btnActive" : ""}`}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
            <button className="btn btn-secondary" type="button" onClick={toggleTheme}>
              {theme === "poster" ? "Dark mode" : "Light mode"}
            </button>
            {signedIn ? (
              <Link
                className="btn btn-secondary"
                href={isPortal ? "/staff" : "/loyalty"}
                title={isPortal ? "Staff account" : "Account"}
              >
                {displayName}
              </Link>
            ) : (
              <Link
                className="btn btn-secondary"
                href={isPortal ? `/signin?callbackUrl=${encodeURIComponent(portalCallbackUrl)}` : "/signin"}
              >
                Sign in
              </Link>
            )}
          </nav>

          <button
            className={`iconButton navMobileButton ${open ? "iconButtonActive" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open ? "true" : "false"}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {open ? (
              <span className="iconX" aria-hidden="true">
                ×
              </span>
            ) : (
              <span className="iconLines" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <div
        className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`}
        onClick={open ? () => setOpen(false) : undefined}
        aria-hidden={open ? "false" : "true"}
      />

      <aside
        id="mobile-drawer"
        className={`drawer ${open ? "drawerOpen" : ""}`}
        aria-hidden={open ? "false" : "true"}
        role="dialog"
        aria-modal={open ? "true" : "false"}
        aria-label="Menu"
      >
        <div className="drawerTop">
          <Link href="/" className="brandLink" aria-label={store.name} onClick={() => setOpen(false)}>
            <span className="brandMark" aria-hidden="true">
              <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} />
            </span>
            <span className="brandText">
              <span className="brandName">{isPortal ? "Staff Portal" : store.name}</span>
              <span className="brandTag muted">{isPortal ? "staff & management only" : store.tagline}</span>
            </span>
          </Link>
          <button
            className="iconButton"
            onClick={() => setOpen(false)}
            type="button"
            aria-label="Close"
            title="Close"
          >
            <span className="iconX" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="rowWrap rowWrapTight">
          <span className="pill">{store.openingHours.summary}</span>
          <button className="pill pillButton" type="button" onClick={toggleTheme}>
            {theme === "poster" ? "Dark mode" : "Light mode"}
          </button>
          {signedIn ? (
            <span className="pill">
              Signed in: {displayName}
              {isPortal ? ` (${canUseStaff ? role : "no staff access"})` : ""}
            </span>
          ) : null}
        </div>

        <div className="drawerContent">
          <div className="drawerLinks" role="navigation" aria-label="Primary">
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`drawerLink ${
                  (isPortal ? pathname?.startsWith(link.href) : activeHref === link.href) ? "drawerLinkActive" : ""
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {signedIn ? (
              <button
                className="drawerLink"
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await signOut({ callbackUrl: isPortal ? "/staff" : "/" });
                }}
              >
                Sign out
              </button>
            ) : (
              <Link
                href={isPortal ? `/signin?callbackUrl=${encodeURIComponent(portalCallbackUrl)}` : "/signin"}
                className="drawerLink"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>

          {!isPortal ? (
            <div className="drawerGame" aria-label="Steam Rush mini game">
              <div className="drawerGameTop">
                <div className="drawerGameTitle">
                  Steam Rush <span className="drawerGameMeta muted">· easy · 30s</span>
                </div>
                <div className="drawerGameScore" aria-label={`Score: ${score}. Best: ${bestScore}.`}>
                  <span className="drawerGameScoreNow">{score}</span>
                  <span className="drawerGameScoreBest muted">Best {bestScore}</span>
                </div>
              </div>
              <div className="drawerGameHint muted">
                Just for fun — this does <strong>not</strong> affect your loyalty stamps.
              </div>
              <div className="drawerGameHud">
                <div className="drawerGameHudRow">
                  <div className="drawerGameStat">
                    <div className="drawerGameStatLabel muted">Time</div>
                    <div className="drawerGameStatValue">{isRunning ? timeLeftLabel : "Ready"}</div>
                  </div>
                  <div className="drawerGameStat">
                    <div className="drawerGameStatLabel muted">Combo</div>
                    <div className="drawerGameStatValue">
                      ×{multiplier}
                      <span className="drawerGameStatSub muted">streak {streak} (best {bestStreak})</span>
                    </div>
                  </div>
                </div>
                <div className={`heatMeter ${overheated ? "heatMeterHot" : ""}`} aria-label="Boiler heat">
                  <div className="heatMeterTop">
                    <span className="heatMeterLabel">Boiler</span>
                    <span className="heatMeterValue muted">{overheated ? "OVERHEATED" : `${Math.round(heat)}%`}</span>
                  </div>
                  <progress
                    className="heatMeterBar"
                    aria-hidden="true"
                    value={Math.round(heat)}
                    max={100}
                  />
                </div>
              </div>
              <div className="drawerGameActions">
                <button
                  className={`drawerGameButton ${overheated ? "drawerGameButtonDisabled" : ""}`}
                  type="button"
                  onClick={tapSteam}
                >
                  {isRunning ? (overheated ? "Cooling…" : "Tap for steam") : "Start 30s round"}
                  <span key={tapKey} className="steamBurst" aria-hidden="true" />
                </button>
                <button
                  className="drawerGameReset"
                  type="button"
                  onClick={startRound}
                  disabled={isRunning}
                  title={isRunning ? "Finish the round first" : "Restart round"}
                >
                  Restart
                </button>
              </div>
              {bonusActive ? (
                <button
                  key={bonusKey}
                  className="bonusPuff"
                  type="button"
                  onClick={tapBonus}
                  aria-label="Bonus puff (tap for points)"
                  title="Bonus puff!"
                >
                  Bonus puff
                  <span className="bonusPuffSpark" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
