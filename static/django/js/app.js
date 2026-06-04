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

(function () {
  const forms = Array.from(document.querySelectorAll("[data-cart-form]"));
  const resetTimers = new WeakMap();

  if (!forms.length) {
    return;
  }

  function cartStatusText(count) {
    if (!count) {
      return "Empty";
    }
    return `${count} item${count === 1 ? "" : "s"}`;
  }

  function updateCartCount(count) {
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count < 1;
      badge.setAttribute("aria-label", `${count} item${count === 1 ? "" : "s"} in cart`);
    });

    document.querySelectorAll("[data-cart-status]").forEach((status) => {
      status.textContent = cartStatusText(count);
    });
  }

  function setButtonLabel(button, label) {
    const labelNode = button.querySelector("[data-add-label]");
    if (labelNode) {
      labelNode.textContent = label;
    } else {
      button.textContent = label;
    }
  }

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      const button = form.querySelector("[data-add-button]");
      const status = form.querySelector("[data-cart-status-text]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();

      const defaultLabel = button.dataset.defaultLabel || "Add to cart";
      const existingTimer = resetTimers.get(button);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      button.disabled = true;
      button.classList.remove("isAdded");
      form.classList.add("isSubmitting");
      setButtonLabel(button, "Adding...");
      if (status) {
        status.textContent = "";
      }

      try {
        const response = await window.fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (!response.ok) {
          throw new Error("Cart request failed");
        }

        const data = await response.json();
        updateCartCount(Number(data.cart_count || 0));
        button.classList.add("isAdded");
        setButtonLabel(button, "Added");
        if (status) {
          status.textContent = `${data.item_name || form.dataset.itemName || "Item"} added`;
        }

        const resetTimer = window.setTimeout(() => {
          button.classList.remove("isAdded");
          setButtonLabel(button, defaultLabel);
          if (status) {
            status.textContent = "";
          }
          resetTimers.delete(button);
        }, 1100);
        resetTimers.set(button, resetTimer);
      } catch (error) {
        form.submit();
        return;
      } finally {
        form.classList.remove("isSubmitting");
        button.disabled = false;
      }
    });
  });
})();
