"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { store } from "@/lib/store";

function isPortalPath(pathname: string | null | undefined) {
  return Boolean(pathname && (pathname.startsWith("/staff") || pathname.startsWith("/manager")));
}

function portalTitle(pathname: string | null | undefined) {
  if (pathname?.startsWith("/manager")) return "Manager portal";
  return "Staff portal";
}

export function PortalHeader() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const canUseStaff = role === "staff" || role === "manager";
  const canUseManager = role === "manager";
  const inPortal = isPortalPath(pathname);

  if (!inPortal) return null;

  const title = portalTitle(pathname);

  return (
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
          <Link className="btn btn-secondary" href="/">
            Customer app
          </Link>

          {canUseStaff ? (
            <>
              <Link className="btn btn-secondary" href="/staff/orders">
                Orders
              </Link>
              <Link className="btn btn-secondary" href="/staff/loyalty-scan">
                Loyalty scan
              </Link>
            </>
          ) : null}

          {canUseManager ? (
            <>
              <Link className="btn btn-secondary" href="/manager/products">
                Products
              </Link>
              <Link className="btn btn-secondary" href="/manager/users">
                Users
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
      </div>
    </header>
  );
}

