"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartContext";
import { canAccessBoilerBuster } from "@/lib/boiler-buster-access";
import { store } from "@/lib/store";

type DrawerLink = { href: string; label: string; badge?: number };

const links: Array<{ href: string; label: string }> = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/orders", label: "Orders" },
  { href: "/feedback", label: "Feedback" }
];

function ThemeToggleButton(props: {
  theme: "poster" | "dark";
  onToggle: () => void;
  compact?: boolean;
}) {
  const isDark = props.theme === "dark";
  return (
    <button
      className={`themeToggle ${isDark ? "themeToggleDark" : "themeTogglePoster"} ${props.compact ? "themeToggleCompact" : ""}`}
      type="button"
      onClick={props.onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="themeToggleOrb" aria-hidden="true">
        <span className="themeToggleSun" />
        <span className="themeToggleMoon" />
        <span className="themeToggleSpark themeToggleSparkA" />
        <span className="themeToggleSpark themeToggleSparkB" />
      </span>
      <span className="themeToggleText">
        <span className="themeToggleTitle">{isDark ? "Light mode" : "Dark mode"}</span>
        <span className="themeToggleSub">{isDark ? "Midnight active" : "Golden hour"}</span>
      </span>
    </button>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const { lines } = useCart();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const canUseStaff = role === "staff" || role === "manager";
  const canUseManager = role === "manager";
  const canPlayBoilerBuster = canAccessBoilerBuster(role);
  const cartCount = useMemo(() => lines.reduce((sum, line) => sum + line.qty, 0), [lines]);
  const isPortal = pathname?.startsWith("/staff") || pathname?.startsWith("/manager");
  const portalKind = pathname?.startsWith("/manager") ? "manager" : "staff";
  const portalCallbackUrl = useMemo(() => {
    if (!pathname) return "/staff";
    if (pathname.startsWith("/manager")) return pathname;
    if (pathname.startsWith("/staff")) return pathname;
    return "/staff";
  }, [pathname]);
  const displayName = useMemo(() => {
    const user = data?.user as any;
    const name = typeof user?.name === "string" ? user.name.trim() : "";
    const email = typeof user?.email === "string" ? user.email.trim() : "";
    if (name) return name;
    if (email) return email.split("@")[0] || "Account";
    return "Account";
  }, [data?.user]);

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

  const portalLinks = useMemo(() => {
    if (!canUseStaff) return [];
    const list: Array<{ href: string; label: string }> = [
      { href: "/staff/orders", label: "Order queue" },
      { href: "/staff/loyalty-scan", label: "Loyalty scan" }
    ];
    if (canUseManager) {
      list.push({ href: "/manager", label: "Manager home" });
      list.push({ href: "/manager/orders", label: "Orders" });
      list.push({ href: "/manager/products", label: "Products" });
      list.push({ href: "/manager/users", label: "Users" });
      list.push({ href: "/manager/settings", label: "Settings" });
      list.push({ href: "/manager/audit", label: "Audit" });
    }
    return list;
  }, [canUseManager, canUseStaff]);

  const customerDrawerLinks = useMemo(() => {
    const list: DrawerLink[] = links
      .map((link) => {
        if (link.href === "/cart") {
          return {
            ...link,
            badge: cartCount > 0 ? cartCount : undefined
          };
        }
        if (signedIn && link.href === "/loyalty") return { ...link, label: "My QR (loyalty)" };
        if (signedIn && link.href === "/orders") return { ...link, label: "Track orders" };
        return { ...link };
      });

    const ordersIndex = list.findIndex((link) => link.href === "/orders");
    const boilerBusterLink: DrawerLink = { href: "/boiler-buster", label: "Boiler Buster" };

    if (canPlayBoilerBuster) {
      if (ordersIndex === -1) {
        list.push(boilerBusterLink);
      } else {
        list.splice(ordersIndex + 1, 0, boilerBusterLink);
      }
    }

    return list;
  }, [canPlayBoilerBuster, cartCount, signedIn]);

  const drawerLinks: DrawerLink[] = useMemo(() => {
    if (isPortal) return portalLinks.map((link) => ({ ...link }));
    return customerDrawerLinks;
  }, [customerDrawerLinks, isPortal, portalLinks]);

  return (
    <>
      <header className="appHeader">
        <div className="container appHeaderInner">
          <Link href="/" className="brandLink" aria-label={store.name}>
            <span className="brandMark" aria-hidden="true">
              <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} priority />
            </span>
            <span className="brandText">
              <span className="brandName">
                {isPortal ? (portalKind === "manager" ? "Manager Portal" : "Staff Portal") : store.name}
              </span>
              <span className="brandTag muted">{isPortal ? "staff & management only" : store.tagline}</span>
            </span>
          </Link>

          <nav className="navDesktop" aria-label="Primary">
            {isPortal
              ? portalLinks.map((link) => (
                  <Link
                    key={link.href}
                    className={`btn btn-secondary ${pathname?.startsWith(link.href) ? "btnActive" : ""}`}
                    href={link.href}
                    aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))
              : links.map((link) => (
                  <Link
                    key={link.href}
                    className={`btn btn-secondary ${activeHref === link.href ? "btnActive" : ""}`}
                    href={link.href}
                    aria-current={activeHref === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
            <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
            {signedIn ? (
              <Link
                className="btn btn-secondary"
                href={isPortal ? "/staff" : "/loyalty"}
                title={isPortal ? "Staff account" : "Account"}
              >
                {displayName}
              </Link>
            ) : (
              <Link
                className="btn btn-secondary"
                href={isPortal ? `/signin?callbackUrl=${encodeURIComponent(portalCallbackUrl)}` : "/signin"}
              >
                Sign in
              </Link>
            )}
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
            {!isPortal && cartCount > 0 ? (
              <span className="navMobileBadge" aria-label={`${cartCount} item${cartCount === 1 ? "" : "s"} in cart`}>
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div
        className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`}
        onClick={open ? () => setOpen(false) : undefined}
        aria-hidden={!open}
      />

      <aside
        id="mobile-drawer"
        className={`drawer ${open ? "drawerOpen" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open}
        aria-label="Menu"
      >
        <div className="drawerTop">
          <Link href="/" className="brandLink" aria-label={store.name} onClick={() => setOpen(false)}>
            <span className="brandMark" aria-hidden="true">
              <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} />
            </span>
            <span className="brandText">
              <span className="brandName">
                {isPortal ? (portalKind === "manager" ? "Manager Portal" : "Staff Portal") : store.name}
              </span>
              <span className="brandTag muted">{isPortal ? "staff & management only" : store.tagline}</span>
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

        <div className="rowWrap rowWrapTight">
          <span className="pill">{store.openingHours.summary}</span>
          <ThemeToggleButton theme={theme} onToggle={toggleTheme} compact />
          {signedIn ? (
            <span className="pill">
              Signed in: {displayName}
              {isPortal ? ` (${canUseStaff ? role : "no staff access"})` : ""}
            </span>
          ) : null}
        </div>

        <div className="drawerContent">
          <div className="drawerLinks" role="navigation" aria-label="Primary">
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`drawerLink ${
                  pathname?.startsWith(link.href) ? "drawerLinkActive" : ""
                }`}
                aria-current={pathname?.startsWith(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="drawerLinkLabel">
                  <span>{link.label}</span>
                  {link.badge ? <span className="drawerLinkBadge">{link.badge}</span> : null}
                </span>
              </Link>
            ))}
            {signedIn ? (
              <button
                className="drawerLink"
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await signOut({ callbackUrl: isPortal ? "/staff" : "/" });
                }}
              >
                Sign out
              </button>
            ) : (
              <Link
                href={isPortal ? `/signin?callbackUrl=${encodeURIComponent(portalCallbackUrl)}` : "/signin"}
                className="drawerLink"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
