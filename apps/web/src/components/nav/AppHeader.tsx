"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { store } from "@/lib/store";

const links: Array<{ href: string; label: string }> = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/orders", label: "Orders" },
  { href: "/feedback", label: "Feedback" },
];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"poster" | "dark">("poster");

  useEffect(() => {
    const stored = window.localStorage.getItem("ch.theme");
    if (stored === "dark" || stored === "poster") {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    }
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

  const activeHref = useMemo(() => {
    return links.find((l) => pathname?.startsWith(l.href))?.href ?? "";
  }, [pathname]);

    return (
    <header className="appHeader">
      <div className="container appHeaderInner"></div>
        <Link href="/" className="brandLink" aria-label={store.name}>
          <span className="brandMark" aria-hidden="true">
            <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} priority />
          </span>
          <span className="brandText">
            <span className="brandName">{store.name}</span>
            <span className="brandTag muted">{store.tagline}</span>
          </span>
        </Link>

        <nav className="navDesktop" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              className={`btn btn-secondary ${activeHref === l.href ? "btnActive" : ""}`}
              href={l.href}
            >
              {l.label}
            </Link>
          ))}
          <button className="btn btn-secondary" type="button" onClick={toggleTheme}>
            {theme === "poster" ? "Dark mode" : "Light mode"}
          </button>
          <Link className="btn" href="/signin">
            Sign in
          </Link>
        </nav>
        <button>
  className="iconButton navMobileButton"
  aria-label={open ? "Close menu" : "Open menu"}
  aria-expanded={open}
  aria-controls="mobile-drawer"
  type="button"
  <span className="iconLines" aria-hidden="true" />
</button>

<div> className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`}
  aria-hidden={!open}
</div>

<aside>
  id="mobile-drawer"
  className={`drawer ${open ? "drawerOpen" : ""}`}
  aria-hidden={!open}
  role="dialog"
  aria-modal={open ? true : undefined}
  aria-label="Menu"

  <nav className="navMobile" aria-label="Primary">
    {links.map((l) => (
      <Link
        key={l.href}
        className={`btn btn-secondary ${activeHref === l.href ? "btnActive" : ""}`}
        href={l.href}
        onClick={() => setOpen(false)}
      >
        {l.label}
      </Link>
    ))}
    <button className="btn btn-secondary" type="button" onClick={toggleTheme}>
      {theme === "poster" ? "Dark mode" : "Light mode"}
    </button>
    <Link className="btn" href="/signin">
      Sign in
    </Link>
  </nav>
</aside>
    </header>
  );
}
