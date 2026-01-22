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
  { href: "/feedback", label: "Feedback" }
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

  const activeHref = useMemo(() => {
    return links.find((l) => pathname?.startsWith(l.href))?.href ?? "";
  }, [pathname]);

  return (
    <>
      <header className="appHeader">
        <div className="container appHeaderInner">
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
            {links.map((link) => (
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
            <Link className="btn btn-secondary" href="/signin">
              Sign in
            </Link>
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
              <span className="brandName">{store.name}</span>
              <span className="brandTag muted">{store.tagline}</span>
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

        <div className="rowWrap" style={{ marginTop: -2 }}>
          <span className="pill">{store.openingHours.summary}</span>
          <button className="pill" type="button" onClick={toggleTheme} style={{ cursor: "pointer" }}>
            {theme === "poster" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <div className="drawerLinks" role="navigation" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`drawerLink ${activeHref === link.href ? "drawerLinkActive" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/signin" className="drawerLink" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </div>
      </aside>
    </>
  );
}
