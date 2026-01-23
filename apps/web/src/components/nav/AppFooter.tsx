"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { store } from "@/lib/store";

function isAdminRole(role: unknown) {
  return role === "staff" || role === "manager";
}

export function AppFooter() {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/staff") || pathname?.startsWith("/manager");
  const { data } = useSession();
  const role = (data?.user as any)?.role;
  const showAdmin = isAdminRole(role);

  if (isPortal) return null;

  return (
    <footer className="appFooter">
      <div className="container appFooterInner muted">
        <div className="appFooterRow">
          © {new Date().getFullYear()} {store.name} • {store.addressLine} • {store.postcodeLine}
        </div>
        <nav className="appFooterRow" aria-label="Footer">
          <a
            className="appFooterLink"
            href={`https://instagram.com/${store.instagramHandle}`}
            target="_blank"
            rel="noreferrer"
          >
            {store.instagramHandle}
          </a>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/privacy">
            Privacy
          </Link>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/terms">
            Terms
          </Link>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/contact">
            Contact
          </Link>
          {showAdmin ? (
            <>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/staff">
                Staff
              </Link>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/manager">
                Manager
              </Link>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/setup">
                Setup
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
