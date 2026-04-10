"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { store } from "@/lib/store";

function portalTitle(pathname: string | null | undefined) {
  if (pathname?.startsWith("/manager")) return "Manager portal";
  return "Staff portal";
}

export function PortalHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const displayName = ((data?.user as any)?.name || (data?.user as any)?.email || "Account").toString();
  const canUseStaff = role === "staff";
  const canUseManager = role === "manager";
  const inStaffPortal = Boolean(pathname?.startsWith("/staff"));
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const hadBeenOpenRef = useRef(false);

  const title = portalTitle(pathname);
  const drawerLinks = useMemo(() => {
    const links: Array<{ href: string; label: string }> = [];

    if (!canUseManager) {
      links.push({ href: "/", label: "Customer app" });
    }

    if (canUseManager) {
      if (inStaffPortal) {
        links.push({ href: "/manager", label: "Switch to manager" });
      }
    }

    if (canUseStaff) {
      links.push({ href: "/staff/orders", label: "Orders" });
      links.push({ href: "/staff/loyalty-scan", label: "Loyalty scan" });
    }

    if (canUseManager) {
      links.push({ href: "/manager/products", label: "Products" });
      links.push({ href: "/manager/users", label: "Users" });
      links.push({ href: "/manager/feedback", label: "Feedback" });
    }

    return links;
  }, [canUseManager, canUseStaff, inStaffPortal]);

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
    if (open) {
      closeButtonRef.current?.focus();
      hadBeenOpenRef.current = true;
      return;
    }

    if (hadBeenOpenRef.current) {
      openButtonRef.current?.focus();
      hadBeenOpenRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="appHeader portalHeader">
        <div className="container appHeaderInner portalHeaderInner">
          <Link className="brandLink" href={pathname?.startsWith("/manager") ? "/manager" : "/staff"}>
            <span className="brandMark portalBrandMark" aria-hidden="true">
              <Image alt="" src="/ch-favicon.jpeg" width={40} height={40} />
            </span>
            <span className="brandText">
              <span className="brandName">{store.name}</span>
              <span className="brandTag muted">{title}</span>
            </span>
          </Link>

          <nav className="navDesktop portalNav" aria-label="Portal">
            {!canUseManager ? (
              <Link className="btn btn-secondary" href="/">
                Customer app
              </Link>
            ) : null}

            {canUseManager ? (
              inStaffPortal ? (
                <Link className="btn" href="/manager" title="Switch to manager tools">
                  Switch to manager
                </Link>
              ) : null
            ) : null}

            {canUseStaff ? (
              <>
                <Link className="btn btn-secondary" href="/staff/orders" aria-current={pathname?.startsWith("/staff/orders") ? "page" : undefined}>
                  Orders
                </Link>
                <Link className="btn btn-secondary" href="/staff/loyalty-scan" aria-current={pathname?.startsWith("/staff/loyalty-scan") ? "page" : undefined}>
                  Loyalty scan
                </Link>
              </>
            ) : null}

            {canUseManager ? (
              <>
                <Link className="btn btn-secondary" href="/manager/products" aria-current={pathname?.startsWith("/manager/products") ? "page" : undefined}>
                  Products
                </Link>
                <Link className="btn btn-secondary" href="/manager/users" aria-current={pathname?.startsWith("/manager/users") ? "page" : undefined}>
                  Users
                </Link>
                <Link className="btn btn-secondary" href="/manager/feedback" aria-current={pathname?.startsWith("/manager/feedback") ? "page" : undefined}>
                  Feedback
                </Link>
              </>
            ) : null}

            {signedIn ? (
              <button className="btn" type="button" onClick={() => void signOut({ callbackUrl: "/signin" })}>
                Sign out
              </button>
            ) : (
              <Link className="btn" href={`/signin?callbackUrl=${encodeURIComponent(pathname ?? "/staff")}`}>
                Sign in
              </Link>
            )}
          </nav>

          <button
            ref={openButtonRef}
            className={`iconButton navMobileButton ${open ? "iconButtonActive" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open ? "true" : "false"}
            aria-controls="portal-mobile-drawer"
            onClick={() => setOpen((value) => !value)}
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

      <div className={`drawerOverlay ${open ? "drawerOverlayOpen" : ""}`} onClick={open ? () => setOpen(false) : undefined} aria-hidden={!open} />

      <aside
        id="portal-mobile-drawer"
        className={`drawer ${open ? "drawerOpen" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open}
        aria-label="Portal menu"
      >
        <div className="drawerTop">
          <Link href={pathname?.startsWith("/manager") ? "/manager" : "/staff"} className="brandLink" onClick={() => setOpen(false)}>
            <span className="brandMark portalBrandMark" aria-hidden="true">
              <Image alt="" src="/ch-favicon.jpeg" width={40} height={40} />
            </span>
            <span className="brandText">
              <span className="brandName">{store.name}</span>
              <span className="brandTag muted">{title}</span>
            </span>
          </Link>
          <button ref={closeButtonRef} className="iconButton" onClick={() => setOpen(false)} type="button" aria-label="Close portal menu" title="Close">
            <span className="iconX" aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div className="rowWrap rowWrapTight">
          <span className="pill">{signedIn ? `Signed in: ${displayName}` : "Portal access"}</span>
          {signedIn && role ? <span className="pill">Role: {role}</span> : null}
        </div>

        <div className="drawerContent">
          <div className="drawerLinks" role="navigation" aria-label="Portal links">
            {drawerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`drawerLink ${link.href !== "/" && pathname?.startsWith(link.href) ? "drawerLinkActive" : ""}`}
                aria-current={link.href !== "/" && pathname?.startsWith(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="drawerLinkLabel">
                  <span>{link.label}</span>
                </span>
              </Link>
            ))}

            {signedIn ? (
              <button
                className="drawerLink"
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await signOut({ callbackUrl: "/signin" });
                }}
              >
                Sign out
              </button>
            ) : (
              <Link href={`/signin?callbackUrl=${encodeURIComponent(pathname ?? "/staff")}`} className="drawerLink" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
