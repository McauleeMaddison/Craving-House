document.querySelectorAll("[data-confirm]").forEach((element) => {
  element.addEventListener("click", (event) => {
    if (!window.confirm(element.dataset.confirm)) {
      event.preventDefault();
    }
  });
});

(function () {
  const themeKey = "cravingHouseTheme";
  const toggles = Array.from(document.querySelectorAll("[data-theme-toggle]"));

  function getTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function setTheme(nextTheme) {
    const safeTheme = nextTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = safeTheme;
    try {
      localStorage.setItem(themeKey, safeTheme);
    } catch {
      // Preference persistence is optional.
    }

    toggles.forEach((toggle) => {
      const isDark = safeTheme === "dark";
      toggle.classList.toggle("themeToggleDark", isDark);
      toggle.classList.toggle("themeTogglePoster", !isDark);
      toggle.setAttribute("aria-checked", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";

      const title = toggle.querySelector(".themeToggleTitle");
      const subtitle = toggle.querySelector(".themeToggleSub");
      if (title) {
        title.textContent = isDark ? "Dark mode" : "Light mode";
      }
      if (subtitle) {
        subtitle.textContent = isDark ? "Midnight glow" : "Golden glow";
      }
    });
  }

  setTheme(getTheme());

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  });
})();

(function () {
  const toggle = document.querySelector("[data-nav-toggle]");
  const drawer = document.getElementById("mobile-drawer");
  const overlay = document.querySelector("[data-nav-overlay]");
  const header = document.querySelector(".appHeader");
  const closeTargets = Array.from(document.querySelectorAll("[data-nav-close]"));

  if (!toggle || !drawer || !overlay) {
    return;
  }

  function setOpen(open) {
    drawer.classList.toggle("drawerOpen", open);
    overlay.classList.toggle("drawerOverlayOpen", open);
    document.body.classList.toggle("navOpen", open);
    toggle.classList.toggle("iconButtonActive", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    drawer.setAttribute("aria-hidden", String(!open));
    overlay.setAttribute("aria-hidden", String(!open));
    if (header) {
      header.dataset.drawerOpen = String(open);
    }
  }

  toggle.addEventListener("click", () => {
    setOpen(!drawer.classList.contains("drawerOpen"));
  });

  overlay.addEventListener("click", () => {
    setOpen(false);
  });

  closeTargets.forEach((target) => {
    target.addEventListener("click", () => {
      setOpen(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
})();
