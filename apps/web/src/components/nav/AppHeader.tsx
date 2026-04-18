"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartContext";
import { ThemeToggleSwitch } from "@/components/nav/ThemeToggleSwitch";
import { useThemePreference } from "@/components/nav/useThemePreference";
import { canAccessBoilerBuster } from "@/lib/boiler-buster-access";
import { store } from "@/lib/store";

type NavLink = { href: string; label: string };
type DrawerLink = { href: string; label: string; badge?: number };
type DrawerStatus = { label: string; value: string; accent?: boolean; href?: string };

const customerLinks: NavLink[] = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/orders", label: "Orders" },
  { href: "/feedback", label: "Feedback" }
];

const managerPortalBaseLinks: NavLink[] = [
  { href: "/manager", label: "Manager home" },
  { href: "/manager/orders", label: "Orders" },
  { href: "/manager/loyalty-scan", label: "Loyalty scan" }
];

const managerPortalExtraLinks: NavLink[] = [
  { href: "/manager/products", label: "Products" },
  { href: "/manager/users", label: "Users" },
  { href: "/manager/settings", label: "Settings" },
  { href: "/manager/audit", label: "Audit" }
];

const staffPortalLinks: NavLink[] = [
  { href: "/staff/orders", label: "Order queue" },
  { href: "/staff/loyalty-scan", label: "Loyalty scan" }
];

function getPortalTitle(pathname: string | null | undefined) {
  if (pathname?.startsWith("/manager")) return "Manager portal";
  return "Staff portal";
}

function getPortalCallbackUrl(pathname: string | null | undefined) {
  if (!pathname) return "/staff";
  if (pathname.startsWith("/manager") || pathname.startsWith("/staff")) return pathname;
  return "/staff";
}

function toSigninHref(callbackUrl: string) {
  return `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function getDisplayName(user: unknown) {
  const safeUser = user as { name?: unknown; email?: unknown } | undefined;
  const name = typeof safeUser?.name === "string" ? safeUser.name.trim() : "";
  const email = typeof safeUser?.email === "string" ? safeUser.email.trim() : "";
  if (name) return name;
  if (email) return email.split("@")[0] || "Account";
  return "Account";
}

function getPortalLinks(canUseStaff: boolean, canUseManager: boolean): NavLink[] {
  if (!canUseStaff) return [];
  if (!canUseManager) return staffPortalLinks;
  return [...managerPortalBaseLinks, ...managerPortalExtraLinks];
}

function getCustomerDrawerStatuses(signedIn: boolean, canPlayBoilerBuster: boolean): DrawerStatus[] {
  const loyaltyHref = signedIn ? "/loyalty" : toSigninHref("/loyalty");
  const ordersHref = signedIn ? "/orders" : toSigninHref("/orders");

  const statuses: DrawerStatus[] = [
    { href: "/menu", label: "Menu", value: "Open", accent: true },
    { href: loyaltyHref, label: "Loyalty", value: signedIn ? "My QR" : "Sign in" },
    { href: ordersHref, label: "Orders", value: signedIn ? "Track" : "Sign in" }
  ];

  if (canPlayBoilerBuster) {
    statuses.push({ href: "/boiler-buster", label: "Boiler Buster", value: "Play" });
  }

  statuses.push({ href: "/feedback", label: "Feedback", value: "Open" });
  return statuses;
}

function pathOnly(href: string) {
  return href.split("?")[0] ?? href;
}

function isActivePath(pathname: string | null | undefined, href: string) {
  return Boolean(pathname?.startsWith(href));
}

export function AppHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const { lines } = useCart();
  const { theme, toggleTheme } = useThemePreference();

  const [open, setOpen] = useState(false);
  const [homeHeaderCollapsed, setHomeHeaderCollapsed] = useState(false);

  const signedIn = status === "authenticated";
  const role = (data?.user as { role?: string } | undefined)?.role;
  const canUseStaff = role === "staff" || role === "manager";
  const canUseManager = role === "manager";
  const canPlayBoilerBuster = canAccessBoilerBuster(role);

  const isHome = pathname === "/";
  const isPortal = pathname?.startsWith("/staff") || pathname?.startsWith("/manager");
  const inManagerPortal = Boolean(pathname?.startsWith("/manager"));

  const portalHomeHref = inManagerPortal ? "/manager" : "/staff";
  const portalTitle = getPortalTitle(pathname);
  const portalCallbackUrl = getPortalCallbackUrl(pathname);
  const portalSigninHref = toSigninHref(portalCallbackUrl);

  const headerBrandHref = isPortal ? portalHomeHref : "/";
  const displayName = getDisplayName(data?.user);

  const cartCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const activeCustomerHref = customerLinks.find((link) => isActivePath(pathname, link.href))?.href ?? "";

  const portalLinks = getPortalLinks(canUseStaff, canUseManager);
  const desktopLinks = isPortal ? portalLinks : customerLinks;
  const drawerLinks: DrawerLink[] = isPortal
    ? portalLinks.map((link) => ({ ...link }))
    : [{ href: "/cart", label: "Cart", badge: cartCount > 0 ? cartCount : undefined }];
  const drawerStatuses = isPortal ? [] : getCustomerDrawerStatuses(signedIn, canPlayBoilerBuster);

  const showCollapsedHomeHeader = isHome && homeHeaderCollapsed && !open;
  const desktopAccountHref = signedIn ? (isPortal ? portalHomeHref : "/loyalty") : isPortal ? portalSigninHref : "/signin";

  function closeDrawer() {
    setOpen(false);
  }

  function toggleDrawer() {
    setOpen((current) => !current);
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setHomeHeaderCollapsed(false);
      return;
    }

    function onScroll() {
      const nextCollapsed = window.scrollY > 24;
      setHomeHeaderCollapsed((current) => (current === nextCollapsed ? current : nextCollapsed));
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  function renderBrandIdentity() {
    return (
      <>
        <span className="brandMark" aria-hidden="true">
          <Image src="/ch-favicon.jpeg" alt="" width={34} height={34} priority />
        </span>
        <span className="brandText">
          <span className="brandName">{store.name}</span>
          <span className="brandTag muted">{isPortal ? portalTitle : store.tagline}</span>
        </span>
      </>
    );
  }

  function isDesktopLinkActive(href: string) {
    if (isPortal) return isActivePath(pathname, href);
    return activeCustomerHref === href;
  }

  function isDrawerLinkActive(href: string) {
    return isActivePath(pathname, href);
  }

  function isDrawerStatusActive(href: string | undefined) {
    if (!href) return false;
    return isActivePath(pathname, pathOnly(href));
  }

  async function onSignOut() {
    closeDrawer();
    await signOut({ callbackUrl: isPortal ? "/signin" : "/" });
  }

  return (
    <>
      <header
        className={`appHeader ${isHome ? "appHeaderHome" : ""} ${showCollapsedHomeHeader ? "appHeaderHomeScrolled" : ""}`}
        data-drawer-open={open}
      >
        <div className="container appHeaderInner">
          <Link href={headerBrandHref} className="brandLink appHeaderBrandLink" aria-label={store.name}>
            {renderBrandIdentity()}
          </Link>

          <button
            className={`brandLink brandButton appHeaderBrandButton ${open ? "iconButtonActive" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open ? "true" : "false"}
            aria-controls="mobile-drawer"
            onClick={toggleDrawer}
            type="button"
          >
            {renderBrandIdentity()}
            {cartCount > 0 ? (
              <span className="navMobileBadge" aria-label={`${cartCount} item${cartCount === 1 ? "" : "s"} in cart`}>
                {cartCount}
              </span>
            ) : null}
          </button>

          <nav className="navDesktop" aria-label={isPortal ? "Portal" : "Primary"}>
            {desktopLinks.map((link) => {
              const active = isDesktopLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  className={`btn btn-secondary ${active ? "btnActive" : ""}`}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <ThemeToggleSwitch theme={theme} onToggle={toggleTheme} />

            <Link
              className="btn btn-secondary"
              href={desktopAccountHref}
              title={signedIn ? (isPortal ? "Portal home" : "Account") : undefined}
            >
              {signedIn ? displayName : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <div
        className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`}
        onClick={open ? closeDrawer : undefined}
        aria-hidden={!open}
      />

      <aside
        id="mobile-drawer"
        className={`drawer ${open ? "drawerOpen" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open}
        aria-label={isPortal ? "Portal menu" : "Menu"}
      >
        <div className="drawerTop">
          <Link href={headerBrandHref} className="brandLink" aria-label={store.name} onClick={closeDrawer}>
            {renderBrandIdentity()}
          </Link>
          <button className="iconButton" onClick={closeDrawer} type="button" aria-label="Close" title="Close">
            <span className="iconX" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="rowWrap rowWrapTight">
          <span className="pill">{store.openingHours.summary}</span>
          <ThemeToggleSwitch theme={theme} onToggle={toggleTheme} compact />
          {signedIn ? (
            <span className="pill">
              Signed in: {displayName}
              {isPortal ? ` (${canUseStaff ? role : "no staff access"})` : ""}
            </span>
          ) : null}
        </div>

        <div className="drawerContent">
          {drawerStatuses.length > 0 ? (
            <div className="drawerStatus" aria-label="Dashboard status">
              {drawerStatuses.map((status) => {
                const active = isDrawerStatusActive(status.href);
                const rowClassName = `drawerStatusRow ${status.href ? "drawerStatusAction" : ""} ${
                  active ? "drawerStatusRowActive" : ""
                }`;
                const statusValueClass = `drawerStatusValue ${status.accent ? "drawerStatusValueAccent" : ""}`;

                const rowContent = (
                  <>
                    <span className="drawerStatusLabel">{status.label}</span>
                    <span className="drawerStatusMeta">
                      <span className={statusValueClass}>{status.value}</span>
                      {status.href ? (
                        <span className="drawerStatusChevron" aria-hidden="true">
                          ›
                        </span>
                      ) : null}
                    </span>
                  </>
                );

                if (!status.href) {
                  return (
                    <div className={rowClassName} key={`${status.label}-${status.value}`}>
                      {rowContent}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${status.label}-${status.href}`}
                    href={status.href}
                    className={rowClassName}
                    onClick={closeDrawer}
                    aria-current={active ? "page" : undefined}
                  >
                    {rowContent}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="drawerLinks" role="navigation" aria-label={isPortal ? "Portal links" : "Primary"}>
            {drawerLinks.map((link) => {
              const active = isDrawerLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`drawerLink ${active ? "drawerLinkActive" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={closeDrawer}
                >
                  <span className="drawerLinkLabel">
                    <span>{link.label}</span>
                    {link.badge ? <span className="drawerLinkBadge">{link.badge}</span> : null}
                  </span>
                </Link>
              );
            })}

            {signedIn ? (
              <button className="drawerLink" type="button" onClick={onSignOut}>
                Sign out
              </button>
            ) : isPortal ? (
              <Link href={portalSigninHref} className="drawerLink" onClick={closeDrawer}>
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
