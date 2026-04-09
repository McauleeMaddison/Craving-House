"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const BEST_SCORE_KEY = "ch.boiler-buster.best-score";
const TUTORIAL_SEEN_KEY = "ch.boiler-buster.tutorial-seen";
const GAME_DURATION_MS = 20000;
const TICK_MS = 300;
const TUTORIAL_LIFETIME_MS = 2400;
const STEAM_BURST_LIFETIME_MS = 520;
const ALERT_FLASH_MS = 820;
const PERSONAL_BEST_FLASH_MS = 1800;

type GamePhase = "idle" | "playing" | "won" | "lost";

type GameState = {
  phase: GamePhase;
  score: number;
  pressure: number;
  timeLeftMs: number;
  combo: number;
  taps: number;
};

type PressureLevelKey = "Calm" | "Steady" | "Rising" | "Danger" | "Critical";

type SteamBurst = {
  id: number;
  x: number;
  y: number;
};

function createGameState(phase: GamePhase = "idle"): GameState {
  return {
    phase,
    score: 0,
    pressure: 34,
    timeLeftMs: GAME_DURATION_MS,
    combo: 0,
    taps: 0
  };
}

function applyVent(state: GameState): GameState {
  const relief = state.pressure >= 82 ? 26 : state.pressure >= 58 ? 21 : 16;
  const points = state.pressure >= 82 ? 4 : state.pressure >= 58 ? 3 : 2;

  return {
    ...state,
    pressure: Math.max(0, state.pressure - relief),
    score: state.score + points,
    combo: Math.min(state.combo + 1, 9),
    taps: state.taps + 1
  };
}

function getStatusCopy(game: GameState) {
  if (game.phase === "won") {
    return "Queue clear. Your drinks should be nearly up.";
  }
  if (game.phase === "lost") {
    return "Overheated. Restart and keep the gauge out of the red.";
  }
  if (game.phase === "playing") {
    return "Tap the boiler to bleed pressure before it spikes.";
  }
  return "Tap the boiler and hold steady for 20 seconds.";
}

function getPressureLevelKey(pressure: number): PressureLevelKey {
  if (pressure >= 85) return "Critical";
  if (pressure >= 70) return "Danger";
  if (pressure >= 50) return "Rising";
  if (pressure >= 25) return "Steady";
  return "Calm";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BoilerBusterClient() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [bestScore, setBestScore] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [steamBursts, setSteamBursts] = useState<SteamBurst[]>([]);
  const [nearMissWarning, setNearMissWarning] = useState(false);
  const [personalBestFlash, setPersonalBestFlash] = useState(false);
  const [newBestThisRound, setNewBestThisRound] = useState(false);
  const burstIdRef = useRef(0);
  const machineRef = useRef<HTMLSpanElement | null>(null);
  const nearMissCooldownRef = useRef(false);
  const nearMissTimeoutRef = useRef<number | null>(null);
  const personalBestTimeoutRef = useRef<number | null>(null);

  function dismissTutorial() {
    setShowTutorial(false);
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = Number.parseInt(stored ?? "", 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setBestScore(parsed);
    }

    if (window.localStorage.getItem(TUTORIAL_SEEN_KEY) !== "true") {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (game.score <= bestScore) return;
    setBestScore(game.score);
    window.localStorage.setItem(BEST_SCORE_KEY, String(game.score));
    setPersonalBestFlash(true);
    setNewBestThisRound(true);

    if (personalBestTimeoutRef.current) {
      window.clearTimeout(personalBestTimeoutRef.current);
    }
    personalBestTimeoutRef.current = window.setTimeout(() => {
      setPersonalBestFlash(false);
    }, PERSONAL_BEST_FLASH_MS);
  }, [bestScore, game.score]);

  useEffect(() => {
    if (!showTutorial) return;
    const timeoutId = window.setTimeout(() => {
      dismissTutorial();
    }, TUTORIAL_LIFETIME_MS);
    return () => window.clearTimeout(timeoutId);
  }, [showTutorial]);

  useEffect(() => {
    return () => {
      if (nearMissTimeoutRef.current) window.clearTimeout(nearMissTimeoutRef.current);
      if (personalBestTimeoutRef.current) window.clearTimeout(personalBestTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (game.phase !== "playing") return;

    const intervalId = window.setInterval(() => {
      setGame((current) => {
        if (current.phase !== "playing") return current;

        const timeLeftMs = Math.max(0, current.timeLeftMs - TICK_MS);
        const pressureRise = 7 + Math.random() * 10 + Math.min(current.score, 80) * 0.09;
        const comboCooling = Math.min(current.combo, 5) * 0.55;
        const pressure = Math.min(100, current.pressure + pressureRise - comboCooling);
        const combo = Math.max(0, current.combo - 1);

        if (timeLeftMs === 0) {
          return {
            ...current,
            phase: "won",
            pressure,
            timeLeftMs,
            combo
          };
        }

        if (pressure >= 100) {
          return {
            ...current,
            phase: "lost",
            pressure: 100,
            timeLeftMs,
            combo: 0
          };
        }

        return {
          ...current,
          pressure,
          timeLeftMs,
          combo
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [game.phase]);

  useEffect(() => {
    if (game.phase !== "playing") {
      setNearMissWarning(false);
      nearMissCooldownRef.current = false;
      if (nearMissTimeoutRef.current) {
        window.clearTimeout(nearMissTimeoutRef.current);
        nearMissTimeoutRef.current = null;
      }
      return;
    }

    if (game.pressure >= 80 && !nearMissCooldownRef.current) {
      nearMissCooldownRef.current = true;
      setNearMissWarning(true);

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(18);
      }

      if (nearMissTimeoutRef.current) {
        window.clearTimeout(nearMissTimeoutRef.current);
      }
      nearMissTimeoutRef.current = window.setTimeout(() => {
        setNearMissWarning(false);
      }, ALERT_FLASH_MS);
    }

    if (game.pressure < 72) {
      nearMissCooldownRef.current = false;
    }
  }, [game.phase, game.pressure]);

  function startFreshShift() {
    setGame(createGameState("playing"));
    setNearMissWarning(false);
    setNewBestThisRound(false);
  }

  function spawnSteamBurst(x: number, y: number) {
    const id = burstIdRef.current + 1;
    burstIdRef.current = id;

    setSteamBursts((current) => [...current, { id, x, y }]);

    window.setTimeout(() => {
      setSteamBursts((current) => current.filter((burst) => burst.id !== id));
    }, STEAM_BURST_LIFETIME_MS);
  }

  function handleTap(event?: React.MouseEvent<HTMLButtonElement>) {
    if (game.phase === "lost") return;
    if (showTutorial) dismissTutorial();

    const rect = machineRef.current?.getBoundingClientRect();
    if (rect) {
      const rawX = (((event?.clientX ?? rect.left + rect.width * 0.5) - rect.left) / rect.width) * 100;
      const rawY = (((event?.clientY ?? rect.top + rect.height * 0.62) - rect.top) / rect.height) * 100;
      const x = clamp(rawX, 28, 72);
      const y = clamp(rawY, 46, 78);
      spawnSteamBurst(x, y);
    } else {
      spawnSteamBurst(50, 62);
    }

    setGame((current) => {
      if (current.phase !== "playing") {
        return applyVent(createGameState("playing"));
      }
      return applyVent(current);
    });
  }

  const timeLeftSeconds = Math.ceil(game.timeLeftMs / 1000);
  const queueProgress = Math.round(((GAME_DURATION_MS - game.timeLeftMs) / GAME_DURATION_MS) * 100);
  const pressureLevelKey = getPressureLevelKey(game.pressure);
  const bestRibbonLabel = personalBestFlash ? "New best" : bestScore > 0 ? "Record" : null;
  const phaseClassName =
    game.phase === "playing"
      ? "boilerBusterStatusPlaying"
      : game.phase === "won"
        ? "boilerBusterStatusWon"
        : game.phase === "lost"
          ? "boilerBusterStatusLost"
          : "";
  const tapZoneClassName =
    game.phase === "playing"
      ? "boilerBusterTapZonePlaying"
      : game.phase === "won"
        ? "boilerBusterTapZoneWon"
        : game.phase === "lost"
          ? "boilerBusterTapZoneLost"
          : "";
  const tapTitle =
    game.phase === "playing"
      ? "Tap to vent"
      : game.phase === "won"
        ? "Queue clear"
        : game.phase === "lost"
          ? "Boiler overheated"
          : "Tap to start";
  const tapSubline =
    game.phase === "playing"
      ? "Orange and red mean tap faster."
      : game.phase === "won"
        ? "You kept the shift under control."
        : game.phase === "lost"
          ? "Use restart below to jump back in."
          : "Hold the boiler below 100% for 20 seconds.";
  const statusLabel =
    game.phase === "playing" ? "Live" : game.phase === "won" ? "Clear" : game.phase === "lost" ? "Overheated" : "Ready";
  const boilerNeedleRotation = -78 + game.pressure * 1.56;
  const shouldEmphasizeRestart = game.phase === "lost";
  const roundButtonLabel =
    game.phase === "playing" ? "Reset round" : game.phase === "won" ? "Play again" : game.phase === "lost" ? "Restart shift" : "Start round";

  return (
    <section className="surface boilerBusterHero u-maxw-760">
      <div className="boilerBusterHeader">
        <div className="boilerBusterHeading">
          <h1 className="boilerBusterTitle">Boiler Buster</h1>
          <p className="muted boilerBusterLead">Tap to vent steam while your order is on the way.</p>
        </div>

        <div className={`boilerBusterStatus ${phaseClassName}`}>{statusLabel}</div>
      </div>

      <div className="surface surfaceFlat boilerBusterBoard">
        <div className="boilerBusterStats">
          <div className="boilerBusterStat">
            <div className="boilerBusterStatLabel">Score</div>
            <div className="boilerBusterStatValue">{game.score}</div>
          </div>
          <div className="boilerBusterStat">
            <div className="boilerBusterStatLabel">Best</div>
            <div className={`boilerBusterStatValue ${personalBestFlash ? "boilerBusterStatValueFlash" : ""}`}>
              {bestScore}
            </div>
            {bestRibbonLabel ? (
              <span className={`boilerBusterBestRibbon ${personalBestFlash ? "boilerBusterBestRibbonFlash" : ""}`}>
                {bestRibbonLabel}
              </span>
            ) : null}
          </div>
          <div className="boilerBusterStat">
            <div className="boilerBusterStatLabel">Time</div>
            <div className="boilerBusterStatValue">{timeLeftSeconds}s</div>
          </div>
          <div className="boilerBusterStat">
            <div className="boilerBusterStatLabel">Combo</div>
            <div className="boilerBusterStatValue">x{Math.max(game.combo, 1)}</div>
          </div>
        </div>

        <div className={`boilerBusterMeterCard boilerBusterMeterCard${pressureLevelKey}`}>
          <div className="boilerBusterMeterTop">
            <div>
              <div className="boilerBusterMeterLabel">Boiler pressure</div>
              <div className="muted boilerBusterMeterHint">Keep it below 100%.</div>
            </div>
            <div className="boilerBusterMeterValue">{Math.round(game.pressure)}%</div>
          </div>
          <div className="boilerBusterMeter" aria-hidden="true">
            <div
              className={`boilerBusterMeterFill boilerBusterMeterFillPressure boilerBusterMeterFill${pressureLevelKey}`}
              style={{ width: `${game.pressure}%` }}
            />
          </div>
          <div className="boilerBusterMeterTop boilerBusterMeterTopSecondary">
            <div className="boilerBusterMeterLabel">Order progress</div>
            <div className="boilerBusterMeterValue">{queueProgress}%</div>
          </div>
          <div className="boilerBusterMeter boilerBusterMeterSecondary" aria-hidden="true">
            <div className="boilerBusterMeterFill boilerBusterMeterFillSecondary" style={{ width: `${queueProgress}%` }} />
          </div>
        </div>

        <button
          className={`boilerBusterTapZone ${tapZoneClassName} ${shouldEmphasizeRestart ? "boilerBusterTapZoneStatic" : ""}`}
          type="button"
          onClick={handleTap}
          aria-label={game.phase === "playing" ? "Vent steam" : shouldEmphasizeRestart ? "Boiler overheated" : "Start Boiler Buster"}
          disabled={shouldEmphasizeRestart}
        >
          {showTutorial ? (
            <span className="boilerBusterTutorial" role="status" aria-live="polite">
              <span className="boilerBusterTutorialTitle">Quick tip</span>
              <span className="boilerBusterTutorialBody">Tap fast when orange or red.</span>
              <span className="boilerBusterTutorialHint">First visit only</span>
            </span>
          ) : null}

          {nearMissWarning ? (
            <span className="boilerBusterNearMiss" role="status" aria-live="polite">
              Near miss
            </span>
          ) : null}

          <span className="boilerBusterMachine" aria-hidden="true" ref={machineRef}>
            <span className="boilerBusterMachineGlow" />
            <span className="boilerBusterMachineTop" />
            <span className="boilerBusterMachineBody" />
            <span className={`boilerBusterGauge boilerBusterGauge${pressureLevelKey}`}>
              <span className="boilerBusterGaugeDot" />
              <span
                className={`boilerBusterNeedle boilerBusterNeedle${pressureLevelKey}`}
                style={{ transform: `rotate(${boilerNeedleRotation}deg)` }}
              />
            </span>
            <span className="boilerBusterValve" />
            <span className="boilerBusterSteam boilerBusterSteamA" />
            <span className="boilerBusterSteam boilerBusterSteamB" />
            <span className="boilerBusterSteam boilerBusterSteamC" />
            {steamBursts.map((burst) => (
              <span
                key={burst.id}
                className="boilerBusterSteamBurst"
                style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
              />
            ))}
          </span>

          <span className="boilerBusterTapCopy">
            <span className="boilerBusterTapTitle">{tapTitle}</span>
            <span className="boilerBusterTapSub">{tapSubline}</span>
          </span>
        </button>

        <div className="boilerBusterActions">
          <button
            className={`btn ${shouldEmphasizeRestart ? "boilerBusterRestartPrimary" : "btn-secondary boilerBusterActionSecondary"}`}
            type="button"
            onClick={startFreshShift}
          >
            {roundButtonLabel}
          </button>
          <div className="boilerBusterAuxLinks">
            <Link className="boilerBusterAuxLink" href="/orders">
              Orders
            </Link>
            <Link className="boilerBusterAuxLink" href="/menu">
              Menu
            </Link>
          </div>
        </div>

        <div className="boilerBusterFooter">
          <p className="muted boilerBusterFooterCopy" aria-live="polite">
            {getStatusCopy(game)}
          </p>
          <div className="boilerBusterMeta">
            {newBestThisRound ? <span className="pill">Personal best</span> : null}
            <span className="pill">Taps {game.taps}</span>
            <span className="pill">{Math.round(game.pressure)}% pressure</span>
          </div>
        </div>
      </div>
    </section>
  );
}
