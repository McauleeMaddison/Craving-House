"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BEST_SCORE_KEY = "ch.boiler-buster.best-score";
const GAME_DURATION_MS = 20000;
const TICK_MS = 300;

type GamePhase = "idle" | "playing" | "won" | "lost";

type GameState = {
  phase: GamePhase;
  score: number;
  pressure: number;
  timeLeftMs: number;
  combo: number;
  taps: number;
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

export function BoilerBusterClient() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [bestScore, setBestScore] = useState(0);

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

  function startFreshShift() {
    setGame(createGameState("playing"));
  }

  function handleTap() {
    setGame((current) => {
      if (current.phase !== "playing") {
        return applyVent(createGameState("playing"));
      }
      return applyVent(current);
    });
  }

  const timeLeftSeconds = Math.ceil(game.timeLeftMs / 1000);
  const queueProgress = Math.round(((GAME_DURATION_MS - game.timeLeftMs) / GAME_DURATION_MS) * 100);
  const pressureLabel = game.pressure >= 85 ? "Critical" : game.pressure >= 60 ? "Running hot" : "Stable";
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
          ? "Restart shift"
          : "Start shift";
  const tapSubline =
    game.phase === "playing"
      ? "Rapid taps drop the pressure and build score."
      : game.phase === "won"
        ? "Your drinks should be nearly ready. Want another run?"
        : game.phase === "lost"
          ? "The boiler hit the red zone. Tap to go again."
          : "Keep the machine calm until the timer reaches zero.";
  const statusLabel =
    game.phase === "playing" ? "Live shift" : game.phase === "won" ? "Order nearly ready" : game.phase === "lost" ? "Overheated" : "Standby";
  const boilerNeedleRotation = -78 + game.pressure * 1.56;

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
              <div className="boilerBusterStatValue">{bestScore}</div>
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

          <div className="boilerBusterMeterCard">
            <div className="boilerBusterMeterTop">
              <div>
                <div className="boilerBusterMeterLabel">Boiler pressure</div>
                <div className="muted boilerBusterMeterHint">{pressureLabel}</div>
              </div>
              <div className="boilerBusterMeterValue">{Math.round(game.pressure)}%</div>
            </div>
            <div className="boilerBusterMeter" aria-hidden="true">
              <div className="boilerBusterMeterFill" style={{ "--fill-width": `${game.pressure}%` } as React.CSSProperties} />
            </div>
            <div className="boilerBusterMeterTop boilerBusterMeterTopSecondary">
              <div>
                <div className="boilerBusterMeterLabel">Order progress</div>
                <div className="muted boilerBusterMeterHint">Hold the line until the queue clears.</div>
              </div>
              <div className="boilerBusterMeterValue">{queueProgress}%</div>
            </div>
            <div className="boilerBusterMeter boilerBusterMeterSecondary" aria-hidden="true">
              <div className="boilerBusterMeterFill boilerBusterMeterFillSecondary" style={{ "--fill-width": `${queueProgress}%` } as React.CSSProperties} />
            </div>
          </div>

          <button
            className={`boilerBusterTapZone ${tapZoneClassName}`}
            type="button"
            onClick={handleTap}
            aria-label={game.phase === "playing" ? "Vent steam" : "Start Boiler Buster"}
          >
            <span className="boilerBusterMachine" aria-hidden="true">
              <span className="boilerBusterMachineGlow" />
              <span className="boilerBusterMachineTop" />
              <span className="boilerBusterMachineBody" />
              <span className="boilerBusterGauge">
                <span className="boilerBusterGaugeDot" />
                <span
                  className="boilerBusterNeedle"
                  style={{ "--needle-rotation": `${boilerNeedleRotation}deg` } as React.CSSProperties}
                />
              </span>
              <span className="boilerBusterValve" />
              <span className="boilerBusterSteam boilerBusterSteamA" />
              <span className="boilerBusterSteam boilerBusterSteamB" />
              <span className="boilerBusterSteam boilerBusterSteamC" />
            </span>

            <span className="boilerBusterTapCopy">
              <span className="boilerBusterTapTitle">{tapTitle}</span>
              <span className="boilerBusterTapSub">{tapSubline}</span>
            </span>
          </button>

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
            <div className="cardTitle">Shift status</div>
            <p className="muted cardBody" aria-live="polite">
              {getStatusCopy(game)}
            </p>
            <div className="boilerBusterMeta">
              <span className="pill">Taps: {game.taps}</span>
              <span className="pill">Pressure: {Math.round(game.pressure)}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
