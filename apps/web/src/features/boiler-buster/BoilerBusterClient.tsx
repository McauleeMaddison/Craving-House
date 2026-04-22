"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useRef, useState } from "react";

import styles from "./BoilerBusterClient.module.css";

const BEST_SCORE_KEY = "ch.boiler-buster.best-score";
const GAME_DURATION_MS = 20000;
const TICK_MS = 300;
const STEAM_BURST_DURATION_MS = 520;
const MAX_STEAM_BURSTS = 8;
const PERFECT_VENT_MIN = 65;
const PERFECT_VENT_MAX = 87;

type GamePhase = "idle" | "playing" | "won" | "lost";
type PressureBand = "Calm" | "Steady" | "Rising" | "Danger" | "Critical";
type VentTone = "steady" | "perfect" | "clutch";

type GameState = {
  phase: GamePhase;
  score: number;
  pressure: number;
  timeLeftMs: number;
  combo: number;
  taps: number;
  lastVentLabel: string;
  lastVentTone: VentTone;
};

type SteamBurst = {
  id: number;
  left: number;
  top: number;
};

function createGameState(phase: GamePhase = "idle"): GameState {
  return {
    phase,
    score: 0,
    pressure: 34,
    timeLeftMs: GAME_DURATION_MS,
    combo: 0,
    taps: 0,
    lastVentLabel: "Tap the boiler to begin.",
    lastVentTone: "steady"
  };
}

function applyVent(state: GameState): GameState {
  const isPerfectWindow = state.pressure >= PERFECT_VENT_MIN && state.pressure <= PERFECT_VENT_MAX;
  const isClutchWindow = state.pressure > PERFECT_VENT_MAX;
  const relief = state.pressure >= 82 ? 26 : state.pressure >= 58 ? 21 : 16;
  const points = state.pressure >= 82 ? 4 : state.pressure >= 58 ? 3 : 2;
  const bonusPoints = isPerfectWindow ? 2 : isClutchWindow ? 1 : 0;
  const streakBonus = state.combo >= 5 ? 1 : 0;
  const reliefBonus = isPerfectWindow ? 4 : isClutchWindow ? 6 : 0;
  const totalPoints = points + bonusPoints + streakBonus;
  const ventTone: VentTone = isPerfectWindow ? "perfect" : isClutchWindow ? "clutch" : "steady";
  let lastVentLabel = isPerfectWindow
    ? "Perfect +2"
    : isClutchWindow
      ? "Clutch +1"
      : state.pressure < 40
        ? "Early vent"
        : "Clean vent";

  if (streakBonus > 0) {
    lastVentLabel += ` | Streak +${streakBonus}`;
  }

  return {
    ...state,
    pressure: Math.max(0, state.pressure - relief - reliefBonus),
    score: state.score + totalPoints,
    combo: Math.min(state.combo + 1, 9),
    taps: state.taps + 1,
    lastVentLabel,
    lastVentTone: ventTone
  };
}

function getPressureBand(pressure: number): PressureBand {
  if (pressure >= 88) return "Critical";
  if (pressure >= 72) return "Danger";
  if (pressure >= 55) return "Rising";
  if (pressure >= 35) return "Steady";
  return "Calm";
}

function getStatusCopy(game: GameState, pressureBand: PressureBand) {
  if (game.phase === "won") {
    return "Round clear. Your order queue is ready.";
  }
  if (game.phase === "lost") {
    return "Boiler overheated. Start again and keep pressure away from red.";
  }
  if (game.phase === "playing") {
    if (pressureBand === "Critical") return "Critical pressure. Tap quickly now.";
    if (pressureBand === "Danger") return "Pressure is spiking. Vent now.";
    if (pressureBand === "Rising") return "Heat is building. Vent now to stay in control.";
    return `Machine is stable. Aim for ${PERFECT_VENT_MIN}-${PERFECT_VENT_MAX}% for bonus vents.`;
  }
  return "Tap the boiler to start, then hold pressure below 100% for 20 seconds.";
}

export function BoilerBusterClient() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [bestScore, setBestScore] = useState(0);
  const [steamBursts, setSteamBursts] = useState<SteamBurst[]>([]);
  const steamBurstIdRef = useRef(0);
  const steamBurstTimersRef = useRef<number[]>([]);
  const previousPressureBandRef = useRef<PressureBand>("Calm");

  useEffect(() => {
    const stored = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = Number.parseInt(stored ?? "", 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setBestScore(parsed);
    }
  }, []);

  useEffect(() => {
    if (game.score <= bestScore) return;
    setBestScore(game.score);
    window.localStorage.setItem(BEST_SCORE_KEY, String(game.score));
  }, [bestScore, game.score]);

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
    return () => {
      for (const timerId of steamBurstTimersRef.current) {
        window.clearTimeout(timerId);
      }
      steamBurstTimersRef.current = [];
    };
  }, []);

  function startFreshShift() {
    setGame(createGameState("playing"));
  }

  function queueSteamBurst(event: MouseEvent<HTMLButtonElement>) {
    const targetBounds = event.currentTarget.getBoundingClientRect();
    const isKeyboardTrigger = event.clientX === 0 && event.clientY === 0;
    const left = isKeyboardTrigger ? targetBounds.width / 2 : event.clientX - targetBounds.left;
    const top = isKeyboardTrigger ? targetBounds.height / 2 : event.clientY - targetBounds.top;
    const id = steamBurstIdRef.current;
    steamBurstIdRef.current += 1;

    setSteamBursts((current) => [...current.slice(-MAX_STEAM_BURSTS + 1), { id, left, top }]);
    const timeoutId = window.setTimeout(() => {
      setSteamBursts((current) => current.filter((burst) => burst.id !== id));
      steamBurstTimersRef.current = steamBurstTimersRef.current.filter((activeTimerId) => activeTimerId !== timeoutId);
    }, STEAM_BURST_DURATION_MS);
    steamBurstTimersRef.current.push(timeoutId);
  }

  function handleTap(event: MouseEvent<HTMLButtonElement>) {
    queueSteamBurst(event);
    setGame((current) => {
      if (current.phase !== "playing") {
        return applyVent(createGameState("playing"));
      }
      return applyVent(current);
    });
  }

  const pressureBand = getPressureBand(game.pressure);
  const isHotPressure = pressureBand === "Danger" || pressureBand === "Critical";
  const isPerfectWindow =
    game.phase === "playing" && game.pressure >= PERFECT_VENT_MIN && game.pressure <= PERFECT_VENT_MAX;

  useEffect(() => {
    if (game.phase !== "playing") {
      previousPressureBandRef.current = pressureBand;
      return;
    }

    const wasHot =
      previousPressureBandRef.current === "Danger" || previousPressureBandRef.current === "Critical";
    if (isHotPressure && !wasHot && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }

    previousPressureBandRef.current = pressureBand;
  }, [game.phase, isHotPressure, pressureBand]);

  const timeLeftSeconds = Math.ceil(game.timeLeftMs / 1000);
  const pressurePercent = Math.round(game.pressure);
  const clampedPressure = Math.min(Math.max(game.pressure, 0), 100);
  const queueProgress = Math.round(((GAME_DURATION_MS - game.timeLeftMs) / GAME_DURATION_MS) * 100);
  const pressureLabel =
    pressureBand === "Critical"
      ? "Critical"
      : pressureBand === "Danger"
        ? "High alert"
        : pressureBand === "Rising"
          ? "Rising"
          : pressureBand === "Steady"
            ? "Steady"
            : "Calm";
  const pressureCoach =
    game.phase !== "playing"
      ? "Tap the boiler to begin a round."
      : isPerfectWindow
        ? `Perfect zone active (${PERFECT_VENT_MIN}-${PERFECT_VENT_MAX}%). Tap now for bonus points.`
      : pressureBand === "Critical"
        ? "Emergency: rapid taps needed."
        : pressureBand === "Danger"
          ? "Tap now to drag pressure back down."
          : pressureBand === "Rising"
            ? "Good pace. Keep pressure below the red zone."
            : `Safe zone. Push toward ${PERFECT_VENT_MIN}-${PERFECT_VENT_MAX}% for better scores.`;
  const queueHint =
    queueProgress >= 90
      ? "Almost done."
      : queueProgress >= 60
        ? "Keep it steady."
        : queueProgress > 0
          ? "Queue is moving."
          : "Hold the line until the queue clears.";
  const pressureToneClassSuffix = pressureBand;
  const meterCardPressureClass = `boilerBusterMeterCard${pressureToneClassSuffix}`;
  const meterFillPressureClass = `boilerBusterMeterFill${pressureToneClassSuffix}`;
  const gaugePressureClass = `boilerBusterGauge${pressureToneClassSuffix}`;
  const needlePressureClass = `boilerBusterNeedle${pressureToneClassSuffix}`;

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
        ? "Queue cleared"
        : game.phase === "lost"
          ? "Boiler tripped"
          : "Start round";
  const tapSubline =
    game.phase === "playing"
      ? isPerfectWindow
        ? `Sweet spot live: ${PERFECT_VENT_MIN}-${PERFECT_VENT_MAX}% for bonus points.`
        : "Keep pressure below 100% and vent before red."
      : game.phase === "won"
        ? "Tap the machine to run another round."
        : game.phase === "lost"
          ? "Pressure hit 100%. Tap to restart."
          : "Hold pressure under 100% until the timer reaches zero.";
  const statusLabel =
    game.phase === "playing"
      ? "Round live"
      : game.phase === "won"
        ? "Queue cleared"
        : game.phase === "lost"
          ? "Boiler tripped"
          : "Standby";
  const boilerNeedleRotation = -78 + game.pressure * 1.56;
  const statusCopy = getStatusCopy(game, pressureBand);
  const lastVentToneClassName =
    game.lastVentTone === "perfect"
      ? styles.meterTagPerfect
      : game.lastVentTone === "clutch"
        ? styles.meterTagClutch
        : styles.meterTagSteady;
  const panelHint =
    game.phase === "playing"
      ? isHotPressure
        ? "Pressure rising. Tap rapidly to recover."
        : isPerfectWindow
          ? "Sweet spot active. Vent now for bonus points."
          : "Build score while pressure is stable."
      : game.phase === "won"
        ? "Round complete. Tap the machine or start a new round."
        : game.phase === "lost"
          ? "Boiler tripped. Tap the machine or restart."
          : "Tap the machine to start your 20 second round.";

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
          <p className={`muted boilerBusterLead ${styles.leadCopy}`}>
            A quick mini-game while your drink is prepared. Vent steam, control pressure, and stay below 100% for 20
            seconds.
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
              <div className="boilerBusterStatValue">{bestScore}</div>
            </div>
            <div className="boilerBusterStat">
              <div className="boilerBusterStatLabel">Time</div>
              <div className="boilerBusterStatValue">{timeLeftSeconds}s</div>
            </div>
            <div className="boilerBusterStat">
              <div className="boilerBusterStatLabel">Streak</div>
              <div className="boilerBusterStatValue">x{Math.max(game.combo, 1)}</div>
            </div>
          </div>

          <div className={`boilerBusterMeterCard ${meterCardPressureClass}`}>
            <div className="boilerBusterMeterTop">
              <div>
                <div className="boilerBusterMeterLabel">Boiler pressure</div>
                <div className="muted boilerBusterMeterHint">{pressureLabel}</div>
              </div>
              <div className="boilerBusterMeterValue">{pressurePercent}%</div>
            </div>
            <div
              className={`boilerBusterMeter ${styles.pressureTrack}`}
              role="progressbar"
              aria-label="Boiler pressure"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pressurePercent}
            >
              <div
                className={`${styles.perfectBand} ${isPerfectWindow ? styles.perfectBandActive : ""}`}
                aria-hidden="true"
              />
              <div
                className={`boilerBusterMeterFill boilerBusterMeterFillPressure ${meterFillPressureClass} ${styles.pressureFill} ${isHotPressure ? styles.pressureFillHot : ""}`}
                style={{ width: `${clampedPressure}%` }}
              />
            </div>
            <p className={`muted boilerBusterMeterHint ${styles.pressureCoach}`} aria-live="polite">
              {pressureCoach}
            </p>
            <div className={styles.meterInfoRow}>
              <span className={`${styles.meterTag} ${isPerfectWindow ? styles.meterTagActive : ""}`}>
                Sweet spot {PERFECT_VENT_MIN}-{PERFECT_VENT_MAX}%
              </span>
              <span className={`${styles.meterTag} ${lastVentToneClassName}`}>Last vent: {game.lastVentLabel}</span>
            </div>
            <div className="boilerBusterMeterTop boilerBusterMeterTopSecondary">
              <div>
                <div className="boilerBusterMeterLabel">Order progress</div>
                <div className="muted boilerBusterMeterHint">{queueHint}</div>
              </div>
              <div className="boilerBusterMeterValue">{queueProgress}%</div>
            </div>
            <div
              className="boilerBusterMeter boilerBusterMeterSecondary"
              role="progressbar"
              aria-label="Order progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={queueProgress}
            >
              <div
                className="boilerBusterMeterFill boilerBusterMeterFillSecondary"
                style={{ width: `${queueProgress}%` }}
              />
            </div>
          </div>

          <button
            className={`boilerBusterTapZone ${tapZoneClassName} ${styles.tapZoneInteractive}`}
            type="button"
            onClick={handleTap}
            aria-label={game.phase === "playing" ? "Vent steam" : "Start Boiler Buster"}
            title={game.phase === "playing" ? "Tap rapidly to release steam" : "Tap to start a new round"}
          >
            <span className="boilerBusterMachine" aria-hidden="true">
              <span className="boilerBusterMachineGlow" />
              <span className="boilerBusterMachineTop" />
              <span className="boilerBusterMachineBody" />
              <span
                className={`boilerBusterGauge ${gaugePressureClass} ${game.phase === "playing" && isHotPressure ? styles.gaugeWarning : ""}`}
              >
                <span className="boilerBusterGaugeDot" />
                <span
                  className={`boilerBusterNeedle ${needlePressureClass} ${game.phase === "playing" && isHotPressure ? styles.needleAlarm : ""}`}
                  style={{ transform: `rotate(${boilerNeedleRotation}deg)` }}
                />
              </span>
              <span className="boilerBusterValve" />
              <span className="boilerBusterSteam boilerBusterSteamA" />
              <span className="boilerBusterSteam boilerBusterSteamB" />
              <span className="boilerBusterSteam boilerBusterSteamC" />
            </span>
            {steamBursts.map((burst) => (
              <span
                key={burst.id}
                className="boilerBusterSteamBurst"
                style={{ left: `${burst.left}px`, top: `${burst.top}px` }}
                aria-hidden="true"
              />
            ))}

            <span className="boilerBusterTapCopy">
              <span className="boilerBusterTapTitle">{tapTitle}</span>
              <span className={`boilerBusterTapSub ${styles.tapSubline}`}>{tapSubline}</span>
            </span>
          </button>
          <p className={`muted ${styles.panelHint}`} aria-live="polite">
            {panelHint}
          </p>

          <div className="rowWrap boilerBusterActions">
            <button className="btn" type="button" onClick={startFreshShift}>
              {game.phase === "playing" ? "Restart round" : "New round"}
            </button>
            <Link className="btn btn-secondary" href="/orders">
              View orders
            </Link>
            <Link className="btn btn-secondary" href="/menu">
              Back to menu
            </Link>
          </div>
        </div>

        <div className="boilerBusterSide">
          <div className="surface surfaceFlat boilerBusterNote">
            <div className="cardTitle">How to play</div>
            <p className={`muted cardBody ${styles.noteCopy}`}>
              Tap to vent steam and stop the boiler from reaching 100%. Survive for 20 seconds to clear the queue.
              Vents in the sweet spot (65-87%) earn bonus points.
            </p>
          </div>

          <div className="surface surfaceFlat boilerBusterNote">
            <div className="cardTitle">Round status</div>
            <p className={`muted cardBody ${styles.noteCopy}`} aria-live="polite">
              {statusCopy}
            </p>
            <div className={`boilerBusterMeta ${styles.metaRow}`}>
              <span className="pill">Taps: {game.taps}</span>
              <span className="pill">Pressure: {pressurePercent}%</span>
              <span className="pill">Zone: {pressureLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
