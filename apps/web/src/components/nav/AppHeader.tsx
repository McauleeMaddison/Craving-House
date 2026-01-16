"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  const { data } = useSession();
  const role = (data?.user as any)?.role as string | undefined;
  const showAdmin = role === "staff" || role === "manager";

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
      <div className="container appHeaderInner">
        <Link href="/" className="brandLink" aria-label={store.name}>
          <span className="brandMark" aria-hidden="true">
            <Image
              src="/ch-favicon.jpeg"
              alt=""
              width={34}
              height={34}
              priority
            />
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

        <button
          className="iconButton navMobileButton"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <span className="iconLines" aria-hidden="true" />
        </button>
      </div>

      <div
        className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="mobile-drawer"
        className={`drawer ${open ? "drawerOpen" : ""}`}
        aria-hidden={!open}
      >
        <div className="drawerTop">
          <Link href="/" className="brandLink" aria-label={store.name}>
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
            <span style={{ fontSize: 22, lineHeight: 1, transform: "translateY(-1px)" }}>×</span>
          </button>
        </div>

        <div className="rowWrap" style={{ marginTop: -2 }}>
          <span className="pill">{store.openingHours.summary}</span>
          <button className="pill" type="button" onClick={toggleTheme} style={{ cursor: "pointer" }}>
            {theme === "poster" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <div className="drawerLinks">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`drawerLink ${activeHref === l.href ? "drawerLinkActive" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="drawerBottom">
          <Link className="btn btn-secondary" href="/help">
            Quick guide
          </Link>
          <Link className="btn" href="/signin">
            Sign in
          </Link>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 10 }}>
            {store.addressLine} • {store.postcodeLine}
            <br />
            <a href="https://instagram.com/cravinghouseashford2025" target="_blank" rel="noreferrer">
              {store.instagramHandle}
            </a>
          </div>
          {showAdmin ? (
            <div className="drawerAdminLinks">
              <Link href="/staff">Staff</Link>
              <span aria-hidden="true">•</span>
              <Link href="/manager">Manager</Link>
              <span aria-hidden="true">•</span>
              <Link href="/setup">Setup</Link>
            </div>
          ) : null}
        </div>
      </aside>
    </header>
  );
}
