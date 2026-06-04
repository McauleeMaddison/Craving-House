(function () {
  const root = document.querySelector("[data-clicker-game]");
  if (!root) {
    return;
  }

  const saveKey = "cravingHouseClickerV1";
  const upgrades = [
    {
      id: "tamper",
      name: "Precision Tamper",
      description: "Adds 1 bean to every brew.",
      baseCost: 15,
      growth: 1.35,
      perClick: 1,
      perSecond: 0,
    },
    {
      id: "grinder",
      name: "Quiet Grinder",
      description: "Adds 4 beans to every brew.",
      baseCost: 80,
      growth: 1.42,
      perClick: 4,
      perSecond: 0,
    },
    {
      id: "brewer",
      name: "Auto Brewer",
      description: "Brews 2 beans every second.",
      baseCost: 120,
      growth: 1.45,
      perClick: 0,
      perSecond: 2,
    },
    {
      id: "barista",
      name: "Rush Barista",
      description: "Brews 8 beans every second.",
      baseCost: 420,
      growth: 1.5,
      perClick: 0,
      perSecond: 8,
    },
    {
      id: "window",
      name: "Pickup Window",
      description: "Adds 30 beans per second for busy service.",
      baseCost: 1400,
      growth: 1.58,
      perClick: 0,
      perSecond: 30,
    },
  ];

  const roastLevels = [
    { name: "Starter", beans: 0 },
    { name: "House Blend", beans: 50 },
    { name: "Morning Rush", beans: 300 },
    { name: "Golden Roast", beans: 1500 },
    { name: "Craving Legend", beans: 6000 },
  ];

  const achievements = [
    { id: "first-brew", title: "First Brew", description: "Earn your first bean.", target: 1 },
    { id: "regular", title: "Regular Customer", description: "Earn 100 total beans.", target: 100 },
    { id: "rush-ready", title: "Rush Ready", description: "Earn 1,000 total beans.", target: 1000 },
    { id: "house-hero", title: "House Hero", description: "Earn 10,000 total beans.", target: 10000 },
  ];

  const elements = {
    beanCount: document.getElementById("bean-count"),
    perClick: document.getElementById("per-click"),
    perSecond: document.getElementById("per-second"),
    roastLevel: document.getElementById("roast-level"),
    nextRoastLabel: document.getElementById("next-roast-label"),
    nextRoastCount: document.getElementById("next-roast-count"),
    progressBar: document.getElementById("roast-progress-bar"),
    brewButton: document.getElementById("brew-button"),
    upgradeList: document.getElementById("upgrade-list"),
    achievementList: document.getElementById("achievement-list"),
    saveStatus: document.getElementById("save-status"),
    resetButton: document.getElementById("reset-game"),
  };

  const startingState = {
    beans: 0,
    totalBeans: 0,
    clickBonus: 0,
    secondBonus: 0,
    upgrades: {},
    achievements: {},
    lastSavedAt: Date.now(),
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey));
      if (!saved || typeof saved !== "object") {
        return { ...startingState };
      }
      return {
        ...startingState,
        ...saved,
        upgrades: { ...startingState.upgrades, ...(saved.upgrades || {}) },
        achievements: { ...startingState.achievements, ...(saved.achievements || {}) },
      };
    } catch {
      return { ...startingState };
    }
  }

  function saveState(message) {
    state.lastSavedAt = Date.now();
    localStorage.setItem(saveKey, JSON.stringify(state));
    if (message) {
      elements.saveStatus.textContent = message;
      window.setTimeout(() => {
        elements.saveStatus.textContent = "Progress saves automatically";
      }, 1600);
    }
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("en-GB");
  }

  function getPerClick() {
    return 1 + state.clickBonus;
  }

  function getPerSecond() {
    return state.secondBonus;
  }

  function getUpgradeCost(upgrade) {
    const owned = state.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, owned));
  }

  function getCurrentRoast() {
    return roastLevels.reduce((current, roast) => {
      return state.totalBeans >= roast.beans ? roast : current;
    }, roastLevels[0]);
  }

  function getNextRoast() {
    return roastLevels.find((roast) => roast.beans > state.totalBeans) || null;
  }

  function earnBeans(amount) {
    state.beans += amount;
    state.totalBeans += amount;
    unlockAchievements();
    render();
    saveState();
  }

  function brew() {
    const amount = getPerClick();
    earnBeans(amount);
    showFloat(`+${formatNumber(amount)}`);
    elements.brewButton.classList.remove("is-brewing");
    window.requestAnimationFrame(() => {
      elements.brewButton.classList.add("is-brewing");
    });
  }

  function showFloat(text) {
    const marker = document.createElement("span");
    marker.className = "bean-float";
    marker.textContent = text;
    const xOffset = Math.round((Math.random() - 0.5) * 80);
    marker.style.setProperty("--float-x", `${xOffset}px`);
    elements.brewButton.appendChild(marker);
    window.setTimeout(() => marker.remove(), 900);
  }

  function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find((item) => item.id === upgradeId);
    if (!upgrade) {
      return;
    }

    const cost = getUpgradeCost(upgrade);
    if (state.beans < cost) {
      elements.saveStatus.textContent = "Not enough beans yet";
      window.setTimeout(() => {
        elements.saveStatus.textContent = "Progress saves automatically";
      }, 1200);
      return;
    }

    state.beans -= cost;
    state.upgrades[upgrade.id] = (state.upgrades[upgrade.id] || 0) + 1;
    state.clickBonus += upgrade.perClick;
    state.secondBonus += upgrade.perSecond;
    render();
    saveState(`${upgrade.name} bought`);
  }

  function unlockAchievements() {
    achievements.forEach((achievement) => {
      if (state.totalBeans >= achievement.target) {
        state.achievements[achievement.id] = true;
      }
    });
  }

  function renderUpgrades() {
    elements.upgradeList.innerHTML = "";
    upgrades.forEach((upgrade) => {
      const owned = state.upgrades[upgrade.id] || 0;
      const cost = getUpgradeCost(upgrade);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.disabled = state.beans < cost;
      button.dataset.upgradeId = upgrade.id;
      button.innerHTML = `
        <span>
          <strong>${upgrade.name}</strong>
          <small>${upgrade.description}</small>
        </span>
        <span class="upgrade-meta">
          <span>Owned ${owned}</span>
          <strong>${formatNumber(cost)}</strong>
        </span>
      `;
      elements.upgradeList.appendChild(button);
    });
  }

  function renderAchievements() {
    elements.achievementList.innerHTML = "";
    achievements.forEach((achievement) => {
      const unlocked = Boolean(state.achievements[achievement.id]);
      const card = document.createElement("div");
      card.className = `achievement-card ${unlocked ? "is-unlocked" : ""}`;
      card.innerHTML = `
        <span class="achievement-badge">${unlocked ? "Done" : "Locked"}</span>
        <strong>${achievement.title}</strong>
        <small>${achievement.description}</small>
      `;
      elements.achievementList.appendChild(card);
    });
  }

  function renderRoastProgress() {
    const current = getCurrentRoast();
    const next = getNextRoast();
    elements.roastLevel.textContent = current.name;
    if (!next) {
      elements.nextRoastLabel.textContent = "Top roast reached";
      elements.nextRoastCount.textContent = "Legendary";
      elements.progressBar.style.width = "100%";
      return;
    }

    const previousBeans = current.beans;
    const required = next.beans - previousBeans;
    const progress = Math.max(0, state.totalBeans - previousBeans);
    const percentage = Math.min(100, (progress / required) * 100);
    elements.nextRoastLabel.textContent = `Next roast: ${next.name}`;
    elements.nextRoastCount.textContent = `${formatNumber(next.beans)} beans`;
    elements.progressBar.style.width = `${percentage}%`;
  }

  function render() {
    elements.beanCount.textContent = formatNumber(state.beans);
    elements.perClick.textContent = formatNumber(getPerClick());
    elements.perSecond.textContent = formatNumber(getPerSecond());
    renderRoastProgress();
    renderUpgrades();
    renderAchievements();
  }

  elements.brewButton.addEventListener("click", brew);

  elements.upgradeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-upgrade-id]");
    if (button) {
      buyUpgrade(button.dataset.upgradeId);
    }
  });

  elements.resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset your Bean Roaster Clicker progress?")) {
      return;
    }
    state = { ...startingState, upgrades: {}, achievements: {}, lastSavedAt: Date.now() };
    saveState("Progress reset");
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && event.target === document.body) {
      event.preventDefault();
      brew();
    }
  });

  window.setInterval(() => {
    const perSecond = getPerSecond();
    if (perSecond > 0) {
      earnBeans(perSecond);
    }
  }, 1000);

  render();
})();
