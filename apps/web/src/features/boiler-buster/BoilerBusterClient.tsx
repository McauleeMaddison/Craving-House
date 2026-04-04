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

type PressureLevel = {
  key: "Calm" | "Steady" | "Rising" | "Danger" | "Critical";
  label: string;
  range: string;
  hint: string;
};

type SteamBurst = {
  id: number;
  x: number;
  y: number;
};

const PRESSURE_LEVELS: PressureLevel[] = [
  { key: "Calm", label: "Calm", range: "0-24%", hint: "Easy cruising" },
  { key: "Steady", label: "Steady", range: "25-49%", hint: "Safe working range" },
  { key: "Rising", label: "Rising", range: "50-69%", hint: "Needs attention soon" },
  { key: "Danger", label: "Danger", range: "70-84%", hint: "Vent now" },
  { key: "Critical", label: "Critical", range: "85-100%", hint: "Red zone" }
];

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
    return "Shift clear. You held the pressure long enough for the order queue to settle.";
  }
  if (game.phase === "lost") {
    return "Overheated. Fire up another shift and keep the gauge out of the red.";
  }
  if (game.phase === "playing") {
    return "Tap the boiler to vent steam before it spikes.";
  }
  return "Tap the boiler when your order is in and keep the machine steady for 20 seconds.";
}

function getPressureLevel(pressure: number): PressureLevel {
  if (pressure >= 85) return PRESSURE_LEVELS[4];
  if (pressure >= 70) return PRESSURE_LEVELS[3];
  if (pressure >= 50) return PRESSURE_LEVELS[2];
  if (pressure >= 25) return PRESSURE_LEVELS[1];
  return PRESSURE_LEVELS[0];
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

    const rect = event?.currentTarget.getBoundingClientRect();
    if (rect) {
      const x = (((event?.clientX ?? rect.left + rect.width * 0.5) - rect.left) / rect.width) * 100;
      const y = (((event?.clientY ?? rect.top + rect.height * 0.46) - rect.top) / rect.height) * 100;
      spawnSteamBurst(x, y);
    } else {
      spawnSteamBurst(50, 46);
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
  const pressureLevel = getPressureLevel(game.pressure);
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
      ? "Vent steam"
      : game.phase === "won"
        ? "Shift cleared"
        : game.phase === "lost"
          ? "Boiler overheated"
          : "Start shift";
  const tapSubline =
    game.phase === "playing"
      ? "Rapid taps drop the pressure and build score."
      : game.phase === "won"
        ? "Your drinks should be nearly ready. Want another run?"
        : game.phase === "lost"
          ? "Use the restart button below to jump straight back in."
          : "Keep the machine calm until the timer reaches zero.";
  const statusLabel =
    game.phase === "playing" ? "Live shift" : game.phase === "won" ? "Order nearly ready" : game.phase === "lost" ? "Overheated" : "Standby";
  const boilerNeedleRotation = -78 + game.pressure * 1.56;
  const shouldEmphasizeRestart = game.phase === "lost";

  return (
    <section className="surface boilerBusterHero u-maxw-980">
      <div className="rowWrap">
        <span className="pill">Customer mini-game</span>
        <span className="pill">Tap while you wait</span>
        <span className="pill">Mobile friendly</span>
      </div>

      <div className="boilerBusterHeader">
        <div className="boilerBusterHeading">
          <h1 className="boilerBusterTitle">Boiler Buster</h1>
          <p className="muted boilerBusterLead">
            A quick tap game for customers waiting on their drinks. Keep the boiler under control for 20 seconds
            and clear the shift before it blows.
          </p>
        </div>

        <div className={`boilerBusterStatus ${phaseClassName}`}>{statusLabel}</div>
      </div>

      <div className="boilerBusterLayout">
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

          <div className={`boilerBusterMeterCard boilerBusterMeterCard${pressureLevel.key}`}>
            <div className="boilerBusterMeterTop">
              <div>
                <div className="boilerBusterMeterLabelRow">
                  <div className="boilerBusterMeterLabel">Boiler pressure</div>
                  <span className={`boilerBusterPressurePill boilerBusterPressurePill${pressureLevel.key}`}>
                    {pressureLevel.label}
                  </span>
                </div>
                <div className="muted boilerBusterMeterHint">
                  {pressureLevel.range} · {pressureLevel.hint}
                </div>
              </div>
              <div className="boilerBusterMeterValue">{Math.round(game.pressure)}%</div>
            </div>
            <div className="boilerBusterMeter" aria-hidden="true">
              <div
                className={`boilerBusterMeterFill boilerBusterMeterFillPressure boilerBusterMeterFill${pressureLevel.key}`}
                style={{ width: `${game.pressure}%` }}
              />
            </div>
            <div className="boilerBusterPressureScale" aria-hidden="true">
              {PRESSURE_LEVELS.map((level) => (
                <span
                  key={level.key}
                  className={`boilerBusterPressureScaleItem ${
                    pressureLevel.key === level.key ? "boilerBusterPressureScaleItemActive" : ""
                  }`}
                >
                  <span className={`boilerBusterPressureScaleSwatch boilerBusterPressureScaleSwatch${level.key}`} />
                  <span>{level.label}</span>
                  <span className="boilerBusterPressureScaleRange">{level.range}</span>
                </span>
              ))}
            </div>
            <div className="boilerBusterMeterTop boilerBusterMeterTopSecondary">
              <div>
                <div className="boilerBusterMeterLabel">Order progress</div>
                <div className="muted boilerBusterMeterHint">Hold the line until the queue clears.</div>
              </div>
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
                Near miss. Vent now.
              </span>
            ) : null}

            <span className="boilerBusterMachine" aria-hidden="true">
              <span className="boilerBusterMachineGlow" />
              <span className="boilerBusterMachineTop" />
              <span className="boilerBusterMachineBody" />
              <span className={`boilerBusterGauge boilerBusterGauge${pressureLevel.key}`}>
                <span className="boilerBusterGaugeDot" />
                <span
                  className={`boilerBusterNeedle boilerBusterNeedle${pressureLevel.key}`}
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

          {shouldEmphasizeRestart ? (
            <div className="boilerBusterActions boilerBusterActionsLost">
              <button className="btn boilerBusterRestartPrimary" type="button" onClick={startFreshShift}>
                Restart shift
              </button>
              <div className="boilerBusterAuxLinks">
                <Link className="boilerBusterAuxLink" href="/orders">
                  Track orders
                </Link>
                <Link className="boilerBusterAuxLink" href="/menu">
                  Back to menu
                </Link>
              </div>
            </div>
          ) : (
            <div className="rowWrap boilerBusterActions">
              <button className="btn" type="button" onClick={startFreshShift}>
                {game.phase === "playing" ? "Restart shift" : "Fresh shift"}
              </button>
              <Link className="btn btn-secondary" href="/orders">
                Track orders
              </Link>
              <Link className="btn btn-secondary" href="/menu">
                Back to menu
              </Link>
            </div>
          )}
        </div>

        <div className="boilerBusterSide">
          <div className="surface surfaceFlat boilerBusterNote">
            <div className="cardTitle">How to play</div>
            <p className="muted cardBody">
              Tap the boiler to release steam, keep the pressure below 100%, and survive until the timer runs out.
              Hotter saves score more points, but they are riskier.
            </p>
          </div>

          <div className="surface surfaceFlat boilerBusterNote">
            <div className="cardTitle">Shift notes</div>
            <div className="boilerBusterChecklist">
              <div className="boilerBusterChecklistItem">20-second rounds keep it short enough for customers in the queue.</div>
              <div className="boilerBusterChecklistItem">Best score saves on this device so returning customers can chase it.</div>
              <div className="boilerBusterChecklistItem">Order progress rises as the round runs, so the finish line is always clear.</div>
            </div>
          </div>

          <div className="surface surfaceFlat boilerBusterNote">
            <div className="cardTitle">Shift status</div>
            <p className="muted cardBody" aria-live="polite">
              {getStatusCopy(game)}
            </p>
            <div className="boilerBusterMeta">
              {newBestThisRound ? <span className="pill">Personal best this round</span> : null}
              <span className="pill">Taps: {game.taps}</span>
              <span className="pill">Pressure: {Math.round(game.pressure)}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
