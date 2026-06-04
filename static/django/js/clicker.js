(function () {
  const root = document.querySelector("[data-boiler-buster]");
  if (!root) {
    return;
  }

  const bestScoreKey = "ch.boiler-buster.best-score";
  const gameDurationMs = 20000;
  const tickMs = 400;
  const perfectVentMin = 65;
  const perfectVentMax = 87;
  const maxSteamBursts = 4;
  const steamBurstDurationMs = 320;
  const reduceVisualEffects = window.matchMedia(
    "(pointer: coarse), (prefers-reduced-motion: reduce)",
  ).matches;

  const elements = {
    status: document.getElementById("bb-status"),
    score: document.getElementById("bb-score"),
    best: document.getElementById("bb-best"),
    bestRibbon: document.getElementById("bb-best-ribbon"),
    time: document.getElementById("bb-time"),
    combo: document.getElementById("bb-combo"),
    pressureCard: document.getElementById("bb-pressure-card"),
    pressureLabel: document.getElementById("bb-pressure-label"),
    pressureValue: document.getElementById("bb-pressure-value"),
    pressureFill: document.getElementById("bb-pressure-fill"),
    pressureBar: document.querySelector(".pressureTrack"),
    pressureCoach: document.getElementById("bb-pressure-coach"),
    perfectBand: document.getElementById("bb-perfect-band"),
    sweetSpot: document.getElementById("bb-sweet-spot"),
    lastVent: document.getElementById("bb-last-vent"),
    queueHint: document.getElementById("bb-queue-hint"),
    queueValue: document.getElementById("bb-queue-value"),
    queueFill: document.getElementById("bb-queue-fill"),
    tapZone: document.getElementById("bb-tap-zone"),
    gauge: document.getElementById("bb-gauge"),
    needle: document.getElementById("bb-needle"),
    tapTitle: document.getElementById("bb-tap-title"),
    tapSub: document.getElementById("bb-tap-sub"),
    panelHint: document.getElementById("bb-panel-hint"),
    newRound: document.getElementById("bb-new-round"),
    statusCopy: document.getElementById("bb-status-copy"),
    taps: document.getElementById("bb-taps"),
    pressurePill: document.getElementById("bb-pressure-pill"),
    zone: document.getElementById("bb-zone"),
  };

  let bestScore = readBestScore();
  let steamBurstId = 0;
  let lastPointerTapAt = 0;
  let state = createGameState("idle");

  function createGameState(phase) {
    return {
      phase,
      score: 0,
      pressure: 34,
      timeLeftMs: gameDurationMs,
      combo: 0,
      taps: 0,
      lastVentLabel: "Tap the boiler to begin.",
      lastVentTone: "steady",
    };
  }

  function readBestScore() {
    try {
      const parsed = Number.parseInt(localStorage.getItem(bestScoreKey) || "", 10);
      return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    } catch {
      return 0;
    }
  }

  function saveBestScore(score) {
    if (score <= bestScore) {
      return;
    }
    bestScore = score;
    try {
      localStorage.setItem(bestScoreKey, String(score));
    } catch {
      // Local storage can be unavailable in private browser modes.
    }
    elements.bestRibbon.hidden = false;
    elements.bestRibbon.classList.remove("boilerBusterBestRibbonFlash");
    window.requestAnimationFrame(() => {
      elements.bestRibbon.classList.add("boilerBusterBestRibbonFlash");
    });
  }

  function getPressureBand(pressure) {
    if (pressure >= 88) return "Critical";
    if (pressure >= 72) return "Danger";
    if (pressure >= 55) return "Rising";
    if (pressure >= 35) return "Steady";
    return "Calm";
  }

  function applyVent(current) {
    const isPerfectWindow = current.pressure >= perfectVentMin && current.pressure <= perfectVentMax;
    const isClutchWindow = current.pressure > perfectVentMax;
    const relief = current.pressure >= 82 ? 26 : current.pressure >= 58 ? 21 : 16;
    const points = current.pressure >= 82 ? 4 : current.pressure >= 58 ? 3 : 2;
    const bonusPoints = isPerfectWindow ? 2 : isClutchWindow ? 1 : 0;
    const streakBonus = current.combo >= 5 ? 1 : 0;
    const reliefBonus = isPerfectWindow ? 4 : isClutchWindow ? 6 : 0;
    const totalPoints = points + bonusPoints + streakBonus;
    let lastVentLabel = isPerfectWindow
      ? "Perfect +2"
      : isClutchWindow
        ? "Clutch +1"
        : current.pressure < 40
          ? "Early vent"
          : "Clean vent";

    if (streakBonus > 0) {
      lastVentLabel += ` | Streak +${streakBonus}`;
    }

    return {
      ...current,
      pressure: Math.max(0, current.pressure - relief - reliefBonus),
      score: current.score + totalPoints,
      combo: Math.min(current.combo + 1, 9),
      taps: current.taps + 1,
      lastVentLabel,
      lastVentTone: isPerfectWindow ? "perfect" : isClutchWindow ? "clutch" : "steady",
    };
  }

  function tick() {
    if (state.phase !== "playing") {
      return;
    }

    const timeLeftMs = Math.max(0, state.timeLeftMs - tickMs);
    const pressureRise = 7 + Math.random() * 10 + Math.min(state.score, 80) * 0.09;
    const comboCooling = Math.min(state.combo, 5) * 0.55;
    const pressure = Math.min(100, state.pressure + pressureRise - comboCooling);
    const combo = Math.max(0, state.combo - 1);

    if (timeLeftMs === 0) {
      state = { ...state, phase: "won", pressure, timeLeftMs, combo };
    } else if (pressure >= 100) {
      state = { ...state, phase: "lost", pressure: 100, timeLeftMs, combo: 0 };
    } else {
      state = { ...state, pressure, timeLeftMs, combo };
    }

    saveBestScore(state.score);
    render();
  }

  function startFreshRound() {
    state = createGameState("playing");
    render();
  }

  function handleTap(event) {
    queueSteamBurst(event);
    if (state.phase !== "playing") {
      state = applyVent(createGameState("playing"));
    } else {
      state = applyVent(state);
    }
    saveBestScore(state.score);
    render();
  }

  function queueSteamBurst(event) {
    if (reduceVisualEffects) {
      return;
    }

    const bounds = elements.tapZone.getBoundingClientRect();
    const isKeyboardTrigger = event.clientX === 0 && event.clientY === 0;
    const left = isKeyboardTrigger ? bounds.width / 2 : event.clientX - bounds.left;
    const top = isKeyboardTrigger ? bounds.height / 2 : event.clientY - bounds.top;
    const burst = document.createElement("span");
    burst.className = "boilerBusterSteamBurst";
    burst.style.left = `${left}px`;
    burst.style.top = `${top}px`;
    burst.dataset.steamBurstId = String(steamBurstId);
    steamBurstId += 1;

    elements.tapZone.appendChild(burst);
    const bursts = elements.tapZone.querySelectorAll(".boilerBusterSteamBurst");
    if (bursts.length > maxSteamBursts) {
      bursts[0].remove();
    }
    window.setTimeout(() => burst.remove(), steamBurstDurationMs);
  }

  function getStatusCopy(phase, pressureBand) {
    if (phase === "won") return "Round clear. Your order queue is ready.";
    if (phase === "lost") return "Boiler overheated. Start again and keep pressure away from red.";
    if (phase === "playing") {
      if (pressureBand === "Critical") return "Critical pressure. Tap quickly now.";
      if (pressureBand === "Danger") return "Pressure is spiking. Vent now.";
      if (pressureBand === "Rising") return "Heat is building. Vent now to stay in control.";
      return `Machine is stable. Aim for ${perfectVentMin}-${perfectVentMax}% for bonus vents.`;
    }
    return "Tap the boiler to start, then keep pressure below 100% for 20 seconds.";
  }

  function setVariantClass(element, classNames, nextClass) {
    classNames.forEach((className) => element.classList.remove(className));
    if (nextClass) {
      element.classList.add(nextClass);
    }
  }

  function render() {
    const pressureBand = getPressureBand(state.pressure);
    const pressurePercent = Math.round(state.pressure);
    const clampedPressure = Math.min(Math.max(state.pressure, 0), 100);
    const queueProgress = Math.round(((gameDurationMs - state.timeLeftMs) / gameDurationMs) * 100);
    const timeLeftSeconds = Math.ceil(state.timeLeftMs / 1000);
    const isHotPressure = pressureBand === "Danger" || pressureBand === "Critical";
    const isPerfectWindow =
      state.phase === "playing" && state.pressure >= perfectVentMin && state.pressure <= perfectVentMax;

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
      state.phase !== "playing"
        ? "Tap the boiler to begin a round."
        : isPerfectWindow
          ? `Perfect zone active (${perfectVentMin}-${perfectVentMax}%). Tap now for bonus points.`
          : pressureBand === "Critical"
            ? "Emergency: rapid taps needed."
            : pressureBand === "Danger"
              ? "Tap now to drag pressure back down."
              : pressureBand === "Rising"
                ? "Good pace. Keep pressure below the red zone."
                : `Safe zone. Push toward ${perfectVentMin}-${perfectVentMax}% for better scores.`;

    const queueHint =
      queueProgress >= 90
        ? "Almost done."
        : queueProgress >= 60
          ? "Keep it steady."
          : queueProgress > 0
            ? "Queue is moving."
            : "Hold the line until the queue clears.";

    const tapTitle =
      state.phase === "playing"
        ? "Tap to vent"
        : state.phase === "won"
          ? "Queue cleared"
          : state.phase === "lost"
            ? "Boiler tripped"
            : "Start round";

    const tapSub =
      state.phase === "playing"
        ? isPerfectWindow
          ? `Sweet spot live: ${perfectVentMin}-${perfectVentMax}% for bonus points.`
          : "Keep pressure below 100% and vent before red."
        : state.phase === "won"
          ? "Tap the machine to run another round."
          : state.phase === "lost"
            ? "Pressure hit 100%. Tap to restart."
            : "Hold pressure under 100% until the timer reaches zero.";

    const statusLabel =
      state.phase === "playing"
        ? "Round live"
        : state.phase === "won"
          ? "Queue cleared"
          : state.phase === "lost"
            ? "Boiler tripped"
            : "Standby";

    const panelHint =
      state.phase === "playing"
        ? isHotPressure
          ? "Pressure rising. Tap rapidly to recover."
          : isPerfectWindow
            ? "Sweet spot active. Vent now for bonus points."
            : "Build score while pressure is stable."
        : state.phase === "won"
          ? "Round complete. Tap the machine or start a new round."
          : state.phase === "lost"
            ? "Boiler tripped. Tap the machine or restart."
            : "Tap the machine to start your 20-second round.";

    elements.score.textContent = String(state.score);
    elements.best.textContent = String(bestScore);
    elements.time.textContent = `${timeLeftSeconds}s`;
    elements.combo.textContent = `x${Math.max(state.combo, 1)}`;
    elements.status.textContent = statusLabel;
    elements.pressureLabel.textContent = pressureLabel;
    elements.pressureValue.textContent = `${pressurePercent}%`;
    elements.pressureFill.style.width = `${clampedPressure}%`;
    elements.pressureBar.setAttribute("aria-valuenow", String(pressurePercent));
    elements.pressureCoach.textContent = pressureCoach;
    elements.queueHint.textContent = queueHint;
    elements.queueValue.textContent = `${queueProgress}%`;
    elements.queueFill.style.width = `${queueProgress}%`;
    elements.tapTitle.textContent = tapTitle;
    elements.tapSub.textContent = tapSub;
    elements.panelHint.textContent = panelHint;
    elements.statusCopy.textContent = getStatusCopy(state.phase, pressureBand);
    elements.taps.textContent = `Taps: ${state.taps}`;
    elements.pressurePill.textContent = `Pressure: ${pressurePercent}%`;
    elements.zone.textContent = `Zone: ${pressureLabel}`;
    elements.needle.style.transform = `rotate(${-78 + state.pressure * 1.56}deg)`;
    elements.tapZone.setAttribute("aria-label", state.phase === "playing" ? "Vent steam" : "Start Boiler Buster");
    elements.newRound.textContent = state.phase === "playing" ? "Restart round" : "New round";

    elements.perfectBand.classList.toggle("perfectBandActive", isPerfectWindow);
    elements.sweetSpot.classList.toggle("meterTagActive", isPerfectWindow);
    elements.pressureFill.classList.toggle("pressureFillHot", isHotPressure);
    elements.gauge.classList.toggle("gaugeWarning", state.phase === "playing" && isHotPressure);
    elements.needle.classList.toggle("needleAlarm", state.phase === "playing" && isHotPressure);

    setVariantClass(elements.status, ["boilerBusterStatusPlaying", "boilerBusterStatusWon", "boilerBusterStatusLost"], `boilerBusterStatus${statusClassSuffix(state.phase)}`);
    setVariantClass(elements.tapZone, ["boilerBusterTapZonePlaying", "boilerBusterTapZoneWon", "boilerBusterTapZoneLost"], `boilerBusterTapZone${statusClassSuffix(state.phase)}`);
    setVariantClass(elements.pressureCard, ["boilerBusterMeterCardCalm", "boilerBusterMeterCardSteady", "boilerBusterMeterCardRising", "boilerBusterMeterCardDanger", "boilerBusterMeterCardCritical"], `boilerBusterMeterCard${pressureBand}`);
    setVariantClass(elements.pressureFill, ["boilerBusterMeterFillCalm", "boilerBusterMeterFillSteady", "boilerBusterMeterFillRising", "boilerBusterMeterFillDanger", "boilerBusterMeterFillCritical"], `boilerBusterMeterFill${pressureBand}`);
    setVariantClass(elements.gauge, ["boilerBusterGaugeCalm", "boilerBusterGaugeSteady", "boilerBusterGaugeRising", "boilerBusterGaugeDanger", "boilerBusterGaugeCritical"], `boilerBusterGauge${pressureBand}`);
    setVariantClass(elements.needle, ["boilerBusterNeedleCalm", "boilerBusterNeedleSteady", "boilerBusterNeedleRising", "boilerBusterNeedleDanger", "boilerBusterNeedleCritical"], `boilerBusterNeedle${pressureBand}`);

    elements.lastVent.className = "meterTag";
    elements.lastVent.classList.add(
      state.lastVentTone === "perfect"
        ? "meterTagPerfect"
        : state.lastVentTone === "clutch"
          ? "meterTagClutch"
          : "meterTagSteady",
    );
    elements.lastVent.textContent = `Last vent: ${state.lastVentLabel}`;
  }

  function statusClassSuffix(phase) {
    if (phase === "playing") return "Playing";
    if (phase === "won") return "Won";
    if (phase === "lost") return "Lost";
    return "";
  }

  elements.tapZone.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    event.preventDefault();
    lastPointerTapAt = Date.now();
    handleTap(event);
  });

  elements.tapZone.addEventListener("click", (event) => {
    if (Date.now() - lastPointerTapAt < 450) {
      return;
    }
    handleTap(event);
  });
  elements.newRound.addEventListener("click", startFreshRound);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && event.target === document.body) {
      event.preventDefault();
      handleTap({ clientX: 0, clientY: 0 });
    }
  });

  window.setInterval(tick, tickMs);
  render();
})();
